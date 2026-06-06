const Admin = require('../models/Admin');
const Panel = require('../models/Panel');
const Subject = require('../models/Subject');
const Section = require('../models/Section');
const Group = require('../models/Group');
const Evaluation = require('../models/Evaluation');
const Rubric = require('../models/Rubric');
const AuditLog = require('../models/AuditLog');
const RegistrationLink = require('../models/RegistrationLink');
const { listProposalFiles } = require('../services/proposalStorage.service');
const { recordAuditLog } = require('../services/audit.service');

const serialize = (doc) => {
  const obj = doc?.toObject ? doc.toObject() : doc;
  return JSON.parse(JSON.stringify(obj || {}));
};

const backupMap = {
  users: async () => {
    const [admins, panels] = await Promise.all([
      Admin.find().select('-password').lean(),
      Panel.find().select('-password').lean(),
    ]);
    return [...admins, ...panels].map((user) => ({
      ...user,
      accountType: user.role,
    }));
  },
  groups: async () => Group.find()
    .populate('section', 'block subject')
    .populate('createdBy', 'name email')
    .lean(),
  results: async () => Evaluation.find({ isLegacyArchived: { $ne: true } })
    .populate('group', 'name')
    .populate('panel', 'name email')
    .populate('subject', 'code title')
    .populate('rubric', 'title')
    .lean(),
  archive: async () => Evaluation.find({ isLegacyArchived: true }).lean(),
  rubrics: async () => Rubric.find()
    .populate('subject', 'code title')
    .populate('createdBy', 'name email')
    .lean(),
  subjects: async () => Subject.find()
    .populate('createdBy', 'name email')
    .lean(),
  registrationLinks: async () => RegistrationLink.find()
    .populate('subject', 'code title')
    .populate('createdBy', 'name email')
    .lean(),
};

exports.getAuditLogs = async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 80), 200);
  const logs = await AuditLog.find()
    .populate('instructor', 'name email')
    .populate('subject', 'code title')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json(logs);
};

exports.getActivity = async (_req, res) => {
  const [latestLogins, latestSubmissions, failedLogins, recentActions] = await Promise.all([
    AuditLog.find({ action: 'login.success' }).sort({ createdAt: -1 }).limit(8).lean(),
    Evaluation.find({ isSubmitted: true, isLegacyArchived: { $ne: true } })
      .populate('group', 'name')
      .populate('panel', 'name email')
      .populate('subject', 'code title')
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean(),
    AuditLog.find({ action: { $in: ['login.failed', 'login.locked'] } }).sort({ createdAt: -1 }).limit(8).lean(),
    AuditLog.find({ action: { $ne: 'login.success' } }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  res.json({ latestLogins, latestSubmissions, failedLogins, recentActions });
};

exports.getInstructorSummary = async (_req, res) => {
  const instructors = await Admin.find({ role: 'admin' })
    .populate('assignedSubjects', 'code title')
    .sort({ name: 1 });

  const summaries = await Promise.all(instructors.map(async (instructor) => {
    const subjectIds = (instructor.assignedSubjects || []).map((subject) => subject._id);
    const sections = await Section.find({ subject: { $in: subjectIds }, createdBy: instructor._id }).select('_id');
    const sectionIds = sections.map((section) => section._id);
    const groups = await Group.find({ section: { $in: sectionIds }, createdBy: instructor._id }).select('_id proposalFile');
    const groupIds = groups.map((group) => group._id);
    const [panelCount, completedEvaluations] = await Promise.all([
      Panel.countDocuments({ createdBy: instructor._id }),
      Evaluation.countDocuments({ group: { $in: groupIds }, isSubmitted: true, isLegacyArchived: { $ne: true } }),
    ]);

    const proposalBytes = groups.reduce((sum, group) => sum + Number(group.proposalFile?.size || 0), 0);
    return {
      _id: instructor._id,
      name: instructor.name,
      email: instructor.email,
      isActive: instructor.isActive,
      subjectLimit: instructor.subjectLimit,
      subjectsUsed: instructor.assignedSubjects?.length || 0,
      subjects: instructor.assignedSubjects || [],
      groups: groups.length,
      panels: panelCount,
      evaluationsCompleted: completedEvaluations,
      csvExportLocked: Boolean(instructor.csvExportLocked),
      gradingLockedSubjects: instructor.gradingLockedSubjects || [],
      proposalStorageMb: Math.round((proposalBytes / 1024 / 1024) * 100) / 100,
    };
  }));

  res.json(summaries);
};

exports.getProposalOrphans = async (_req, res) => {
  const [storageFiles, linkedGroups] = await Promise.all([
    listProposalFiles(),
    Group.find({ 'proposalFile.path': { $exists: true, $ne: '' } }).select('name proposalFile.path').lean(),
  ]);
  const linkedPaths = new Set(linkedGroups.map((group) => group.proposalFile?.path).filter(Boolean));
  const orphans = storageFiles.filter((file) => !linkedPaths.has(file.path));

  res.json({
    totalFiles: storageFiles.length,
    linkedFiles: linkedPaths.size,
    orphanFiles: orphans.length,
    orphans,
  });
};

exports.exportBackup = async (req, res) => {
  const type = req.params.type;
  const loader = backupMap[type];
  if (!loader) {
    return res.status(400).json({ message: 'Unknown backup type' });
  }

  const data = await loader();
  await recordAuditLog(req, {
    action: `backup.export.${type}`,
    entity: { type: 'backup', name: type },
    metadata: { rows: data.length },
  });

  res.json(data.map(serialize));
};
