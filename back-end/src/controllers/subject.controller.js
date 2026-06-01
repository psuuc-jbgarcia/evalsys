const Admin = require('../models/Admin');
const Subject = require('../models/Subject');
const Section = require('../models/Section');
const Group = require('../models/Group');
const Evaluation = require('../models/Evaluation');
const Rubric = require('../models/Rubric');
const RegistrationLink = require('../models/RegistrationLink');
const Settings = require('../models/Settings');
const {
  migrateDefaultSubject,
  getDefaultSubjectMigrationStatus,
} = require('../services/defaultSubjectMigration');

const isSuperadmin = (user) => user?.role === 'superadmin';
const isAssignedToSubject = (user, subjectId) => (
  isSuperadmin(user) ||
  (user?.assignedSubjects || []).some((id) => id.toString() === subjectId.toString())
);

exports.getSubjects = async (req, res) => {
  const filter = isSuperadmin(req.user)
    ? {}
    : { _id: { $in: req.user.assignedSubjects || [] } };
  const subjects = await Subject.find(filter).sort({ createdAt: -1 });
  res.json(subjects);
};

exports.getPublicSubjects = async (_req, res) => {
  const subjects = await Subject.find({ isActive: true }).sort({ code: 1 });
  res.json(subjects);
};

exports.createSubject = async (req, res) => {
  const { code, title, adminIds = [] } = req.body;
  if (!code || !title) return res.status(400).json({ message: 'Code and title required' });

  const subject = await Subject.create({
    code,
    title,
    createdBy: req.user._id,
  });

  const assignedAdminIds = isSuperadmin(req.user) ? adminIds : [req.user._id];
  if (assignedAdminIds.length > 0) {
    await Admin.updateMany(
      { _id: { $in: assignedAdminIds }, role: 'admin' },
      { $addToSet: { assignedSubjects: subject._id } }
    );
  }

  res.status(201).json(subject);
};

exports.updateSubject = async (req, res) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject) return res.status(404).json({ message: 'Subject not found' });
  if (!isAssignedToSubject(req.user, subject._id)) {
    return res.status(403).json({ message: 'You are not assigned to this subject' });
  }

  const { code, title, isActive } = req.body;
  if (code !== undefined) subject.code = code;
  if (title !== undefined) subject.title = title;
  if (isActive !== undefined) subject.isActive = isActive;
  await subject.save();
  res.json(subject);
};

exports.assignSubjectAdmins = async (req, res) => {
  const { adminIds } = req.body;
  if (!Array.isArray(adminIds)) return res.status(400).json({ message: 'adminIds array required' });

  const subject = await Subject.findById(req.params.id);
  if (!subject) return res.status(404).json({ message: 'Subject not found' });

  // Check the limit for each admin being newly assigned
  if (adminIds.length > 0) {
    const settings = await Settings.findOne();
    const limit = settings?.maxSubjectsPerInstructor ?? 1;

    // Find admins currently assigned to this subject (they won't count as "new")
    const currentlyAssigned = await Admin.find({
      role: 'admin',
      assignedSubjects: subject._id,
    }).select('_id');
    const currentIds = new Set(currentlyAssigned.map((a) => a._id.toString()));

    // Only check admins being newly added
    const newlyAdded = adminIds.filter((id) => !currentIds.has(id.toString()));

    if (newlyAdded.length > 0) {
      const wouldExceed = await Admin.find({
        _id: { $in: newlyAdded },
        role: 'admin',
        $expr: { $gte: [{ $size: '$assignedSubjects' }, limit] },
      }).select('name');

      if (wouldExceed.length > 0) {
        const names = wouldExceed.map((a) => a.name).join(', ');
        return res.status(400).json({
          message: `The following instructor(s) have already reached the subject limit (${limit}): ${names}. Increase the limit in Settings to assign more subjects.`,
        });
      }
    }
  }

  await Admin.updateMany({ role: 'admin' }, { $pull: { assignedSubjects: subject._id } });
  if (adminIds.length > 0) {
    await Admin.updateMany(
      { _id: { $in: adminIds }, role: 'admin' },
      { $addToSet: { assignedSubjects: subject._id } }
    );
  }

  res.json({ message: 'Subject instructor assignments updated' });
};

exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    // 1. Find all sections belonging to this subject
    const sections = await Section.find({ subject: subject._id }).select('_id');
    const sectionIds = sections.map((s) => s._id);

    // 2. Find all groups in those sections
    const groups = await Group.find({ section: { $in: sectionIds } }).select('_id');
    const groupIds = groups.map((g) => g._id);

    // 3. Delete evaluations for those groups (also catch any directly subject-tagged)
    await Evaluation.deleteMany({ $or: [{ group: { $in: groupIds } }, { subject: subject._id }] });

    // 4. Delete groups
    await Group.deleteMany({ section: { $in: sectionIds } });

    // 5. Delete sections
    await Section.deleteMany({ subject: subject._id });

    // 6. Delete rubrics
    await Rubric.deleteMany({ subject: subject._id });

    // 7. Delete registration links
    await RegistrationLink.deleteMany({ subject: subject._id });

    // 8. Remove subject from all admins' assignedSubjects
    await Admin.updateMany(
      { assignedSubjects: subject._id },
      { $pull: { assignedSubjects: subject._id } }
    );

    // 9. Delete the subject itself
    await Subject.findByIdAndDelete(subject._id);

    res.json({
      message: `Subject "${subject.code} - ${subject.title}" and all related data deleted successfully.`,
      deleted: {
        sections: sectionIds.length,
        groups: groupIds.length,
        evaluations: groupIds.length > 0 ? '(all for above groups)' : 0,
        rubrics: '(all for subject)',
        registrationLinks: '(all for subject)',
      },
    });
  } catch (err) {
    console.error('Delete subject failed:', err);
    res.status(500).json({ message: 'Failed to delete subject', error: err.message });
  }
};

exports.getDefaultSubjectMigrationStatus = async (_req, res) => {
  try {
    const status = await getDefaultSubjectMigrationStatus();
    res.json(status);
  } catch (err) {
    console.error('Default subject migration status failed:', err);
    res.status(500).json({
      message: 'Default subject migration status check failed.',
      error: err.message,
    });
  }
};

exports.migrateDefaultSubject = async (_req, res) => {
  try {
    const result = await migrateDefaultSubject();
    res.json({
      message: 'Default subject migration complete.',
      ...result,
    });
  } catch (err) {
    console.error('Default subject migration failed:', err);
    res.status(500).json({
      message: 'Default subject migration failed.',
      error: err.message,
    });
  }
};
