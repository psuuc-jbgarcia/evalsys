const Subject = require('../models/Subject');
const Section = require('../models/Section');
const Rubric = require('../models/Rubric');
const Evaluation = require('../models/Evaluation');
const Group = require('../models/Group');
const Admin = require('../models/Admin');

const DEFAULT_SUBJECT = {
  code: 'IPT',
  title: 'Integrative Programming Technologies',
};

const missingSubjectFilter = {
  $or: [
    { subject: { $exists: false } },
    { subject: null },
  ],
};

const migrateDefaultSubject = async () => {
  const subject = await Subject.findOneAndUpdate(
    { code: DEFAULT_SUBJECT.code },
    { $setOnInsert: DEFAULT_SUBJECT },
    { new: true, upsert: true }
  );

  const sectionResult = await Section.updateMany(
    missingSubjectFilter,
    { $set: { subject: subject._id } }
  );

  const rubricResult = await Rubric.updateMany(
    missingSubjectFilter,
    { $set: { subject: subject._id } }
  );

  const adminResult = await Admin.updateMany(
    { role: 'admin' },
    { $addToSet: { assignedSubjects: subject._id } }
  );
  let promotedSuperadmin = null;
  const superadminExists = await Admin.exists({ role: 'superadmin' });
  if (!superadminExists) {
    promotedSuperadmin = await Admin.findOneAndUpdate(
      { role: 'admin' },
      { $set: { role: 'superadmin' } },
      { sort: { createdAt: 1 }, new: true }
    ).select('name email');
  }

  const evaluations = await Evaluation.find(missingSubjectFilter).select('_id group');
  let evaluationsUpdated = 0;
  let evaluationsDefaulted = 0;

  for (const evaluation of evaluations) {
    const group = await Group.findById(evaluation.group)
      .select('section')
      .populate('section', 'subject');

    const subjectId = group?.section?.subject || subject._id;
    if (!group?.section?.subject) evaluationsDefaulted++;

    await Evaluation.updateOne(
      { _id: evaluation._id },
      { $set: { subject: subjectId } }
    );
    evaluationsUpdated++;
  }

  return {
    subject: {
      id: subject._id,
      code: subject.code,
      title: subject.title,
    },
    sectionsUpdated: sectionResult.modifiedCount,
    rubricsUpdated: rubricResult.modifiedCount,
    adminsAssigned: adminResult.modifiedCount,
    promotedSuperadmin: promotedSuperadmin ? {
      id: promotedSuperadmin._id,
      name: promotedSuperadmin.name,
      email: promotedSuperadmin.email,
    } : null,
    evaluationsUpdated,
    evaluationsDefaulted,
  };
};

const getDefaultSubjectMigrationStatus = async () => {
  const subject = await Subject.findOne({ code: DEFAULT_SUBJECT.code });
  const sectionsMissingSubject = await Section.countDocuments(missingSubjectFilter);
  const rubricsMissingSubject = await Rubric.countDocuments(missingSubjectFilter);
  const evaluationsMissingSubject = await Evaluation.countDocuments(missingSubjectFilter);
  const adminsMissingDefaultSubject = subject
    ? await Admin.countDocuments({ role: 'admin', assignedSubjects: { $ne: subject._id } })
    : 0;
  const superadminCount = await Admin.countDocuments({ role: 'superadmin' });

  return {
    subject: subject ? {
      id: subject._id,
      code: subject.code,
      title: subject.title,
    } : null,
    sectionsMissingSubject,
    rubricsMissingSubject,
    evaluationsMissingSubject,
    adminsMissingDefaultSubject,
    superadminCount,
    isComplete: Boolean(subject) &&
      sectionsMissingSubject === 0 &&
      rubricsMissingSubject === 0 &&
      evaluationsMissingSubject === 0 &&
      adminsMissingDefaultSubject === 0 &&
      superadminCount > 0,
  };
};

module.exports = { migrateDefaultSubject, getDefaultSubjectMigrationStatus };
