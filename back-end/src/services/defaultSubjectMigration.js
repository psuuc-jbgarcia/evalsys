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

const DEFAULT_SUPERADMIN = {
  name: 'Super Admin',
  email: 'superadmin@evalsys.com',
  password: 'password',
  role: 'superadmin',
  isActive: true,
};

const DEFAULT_INSTRUCTOR_EMAIL = 'admin@evalsys.com';

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
  let defaultSuperadmin = await Admin.findOne({ email: DEFAULT_SUPERADMIN.email });
  if (!defaultSuperadmin) {
    defaultSuperadmin = new Admin(DEFAULT_SUPERADMIN);
  } else {
    defaultSuperadmin.name = DEFAULT_SUPERADMIN.name;
    defaultSuperadmin.role = DEFAULT_SUPERADMIN.role;
    defaultSuperadmin.isActive = true;
    defaultSuperadmin.password = DEFAULT_SUPERADMIN.password;
    defaultSuperadmin.markModified('password');
  }
  await defaultSuperadmin.save();

  const defaultInstructor = await Admin.findOneAndUpdate(
    { email: DEFAULT_INSTRUCTOR_EMAIL },
    {
      $set: { role: 'admin', isActive: true },
      $addToSet: { assignedSubjects: subject._id },
    },
    { new: true }
  ).select('name email role');

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
    defaultSuperadmin: {
      id: defaultSuperadmin._id,
      name: defaultSuperadmin.name,
      email: defaultSuperadmin.email,
      role: defaultSuperadmin.role,
    },
    defaultInstructor: defaultInstructor ? {
      id: defaultInstructor._id,
      name: defaultInstructor.name,
      email: defaultInstructor.email,
      role: defaultInstructor.role,
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
  const defaultSuperadmin = await Admin.findOne({
    email: DEFAULT_SUPERADMIN.email,
    role: 'superadmin',
    isActive: true,
  });
  const defaultInstructor = subject
    ? await Admin.findOne({
      email: DEFAULT_INSTRUCTOR_EMAIL,
      role: 'admin',
      isActive: true,
      assignedSubjects: subject._id,
    })
    : null;

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
    defaultSuperadminExists: Boolean(defaultSuperadmin),
    defaultInstructorReady: Boolean(defaultInstructor),
    isComplete: Boolean(subject) &&
      sectionsMissingSubject === 0 &&
      rubricsMissingSubject === 0 &&
      evaluationsMissingSubject === 0 &&
      adminsMissingDefaultSubject === 0 &&
      Boolean(defaultSuperadmin) &&
      Boolean(defaultInstructor),
  };
};

module.exports = { migrateDefaultSubject, getDefaultSubjectMigrationStatus };
