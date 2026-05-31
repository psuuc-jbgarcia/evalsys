const Admin = require('../models/Admin');
const Subject = require('../models/Subject');
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

  await Admin.updateMany({ role: 'admin' }, { $pull: { assignedSubjects: subject._id } });
  if (adminIds.length > 0) {
    await Admin.updateMany(
      { _id: { $in: adminIds }, role: 'admin' },
      { $addToSet: { assignedSubjects: subject._id } }
    );
  }

  res.json({ message: 'Subject instructor assignments updated' });
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
