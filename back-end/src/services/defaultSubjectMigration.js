const Subject = require('../models/Subject');
const Section = require('../models/Section');
const Rubric = require('../models/Rubric');
const Evaluation = require('../models/Evaluation');
const Group = require('../models/Group');

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
    evaluationsUpdated,
    evaluationsDefaulted,
  };
};

module.exports = { migrateDefaultSubject };
