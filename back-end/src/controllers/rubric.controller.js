const Rubric = require('../models/Rubric');
const Admin = require('../models/Admin');

const getSubjectId = (req) => req.headers['x-subject-id'] || req.query.subject || req.body.subject;
const canAccessSubject = (req, subjectId) => (
  !subjectId ||
  req.user?.role === 'superadmin' ||
  (req.user?.assignedSubjects || []).some((id) => id.toString() === subjectId.toString())
);

const getOwnerFilter = (ownerId) => (
  ownerId
    ? { createdBy: ownerId }
    : { $or: [{ createdBy: { $exists: false } }, { createdBy: null }] }
);

const getRubricOwnerId = async (req, subject) => {
  if (req.user?.role === 'panel') {
    if (req.user.createdBy) {
      const instructor = await Admin.findOne({
        _id: req.user.createdBy,
        role: 'admin',
        isActive: true,
        assignedSubjects: subject,
      }).select('_id');
      return instructor?._id || null;
    }
    const instructor = await Admin.findOne({ role: 'admin', assignedSubjects: subject }).select('_id').sort({ createdAt: -1 });
    return instructor?._id || null;
  }

  if (req.user?.role === 'admin') return req.user._id;
  return req.query.createdBy || req.headers['x-instructor-id'] || null;
};

const canManageRubric = (req, rubric) => (
  req.user?.role === 'superadmin' ||
  (rubric.createdBy && rubric.createdBy.toString() === req.user?._id.toString())
);

const normalizeActiveRubrics = async (subject, ownerId) => {
  const activeRubrics = await Rubric.find({ subject, ...getOwnerFilter(ownerId), isActive: true }).sort({ createdAt: -1 });
  if (activeRubrics.length <= 1) return activeRubrics[0] || null;

  const [current, ...duplicates] = activeRubrics;
  await Rubric.updateMany(
    { _id: { $in: duplicates.map((rubric) => rubric._id) } },
    { isActive: false }
  );

  return current;
};

const DEFAULT_RUBRIC = {
  title: 'Capstone Defense Rubric',
  criteria: [
    {
      key: 'systemFunctionality',
      label: '1. System Functionality',
      maxScore: 25,
      levels: [
        { label: 'Excellent', minScore: 21, maxScore: 25, description: 'System is complete, responsive, and works without errors.' },
        { label: 'Good',      minScore: 16, maxScore: 20, description: 'System works with minimal issues.' },
        { label: 'Fair',      minScore: 11, maxScore: 15, description: 'System is partially working with several issues.' },
        { label: 'Poor',      minScore: 0,  maxScore: 10, description: 'System has many missing or non-working features.' },
      ],
    },
    {
      key: 'apiIntegration',
      label: '2. API Integration and Database',
      maxScore: 25,
      levels: [
        { label: 'Excellent', minScore: 21, maxScore: 25, description: 'Advanced API integration and database are fully working, secure, and accurate.' },
        { label: 'Good',      minScore: 16, maxScore: 20, description: 'API and database work with minor issues.' },
        { label: 'Fair',      minScore: 11, maxScore: 15, description: 'API/database works partially with noticeable errors.' },
        { label: 'Poor',      minScore: 0,  maxScore: 10, description: 'API/database is incomplete or not working properly.' },
      ],
    },
    {
      key: 'presentation',
      label: '3. Presentation and System Demonstration',
      maxScore: 15,
      levels: [
        { label: 'Excellent', minScore: 13, maxScore: 15, description: 'Presentation is clear, organized, and confident.' },
        { label: 'Good',      minScore: 10, maxScore: 12, description: 'Presentation is good with minor issues.' },
        { label: 'Fair',      minScore: 6,  maxScore: 9,  description: 'Presentation lacks clarity or has demonstration issues.' },
        { label: 'Poor',      minScore: 0,  maxScore: 5,  description: 'Presentation and demonstration are weak.' },
      ],
    },
    {
      key: 'uiUx',
      label: '4. User Interface and User Experience',
      maxScore: 10,
      levels: [
        { label: 'Excellent', minScore: 9, maxScore: 10, description: 'Interface is clean, responsive, and easy to use.' },
        { label: 'Good',      minScore: 7, maxScore: 8,  description: 'Interface is good with minimal issues.' },
        { label: 'Fair',      minScore: 4, maxScore: 6,  description: 'Interface is usable but inconsistent.' },
        { label: 'Poor',      minScore: 0, maxScore: 3,  description: 'Interface is confusing or difficult to use.' },
      ],
    },
    {
      key: 'qa',
      label: '5. Question and Answer',
      maxScore: 25,
      levels: [
        { label: 'Excellent', minScore: 21, maxScore: 25, description: 'Answers questions correctly and confidently.' },
        { label: 'Good',      minScore: 16, maxScore: 20, description: 'Answers most questions with minor mistakes.' },
        { label: 'Fair',      minScore: 11, maxScore: 15, description: 'Answers some questions but lacks confidence.' },
        { label: 'Poor',      minScore: 0,  maxScore: 10, description: 'Unable to answer most questions properly.' },
      ],
    },
  ],
};

// Get active rubric
exports.getActiveRubric = async (req, res) => {
  const subject = getSubjectId(req);
  if (!subject) return res.json(null);
  const ownerId = await getRubricOwnerId(req, subject);
  if (ownerId) await normalizeActiveRubrics(subject, ownerId);
  let rubric = ownerId
    ? await Rubric.findOne({ subject, createdBy: ownerId, isActive: true }).populate('createdBy', 'name email')
    : null;
  res.json(rubric);
};

exports.getAllRubrics = async (req, res) => {
  const subject = getSubjectId(req);
  const filter = {};
  if (subject) {
    if (req.user.role !== 'panel' && !canAccessSubject(req, subject)) {
      return res.status(403).json({ message: 'You are not assigned to this subject' });
    }
    filter.subject = subject;
  } else if (req.user.role === 'panel') {
    return res.status(400).json({ message: 'Subject required' });
  } else if (req.user.role === 'admin') {
    filter.subject = { $in: req.user.assignedSubjects || [] };
  }
  if (req.user.role === 'admin') {
    filter.$or = [
      { createdBy: req.user._id },
      { createdBy: { $exists: false } },
      { createdBy: null },
    ];
  } else if (req.user.role === 'superadmin' && req.query.createdBy) {
    filter.createdBy = req.query.createdBy;
  }
  if (subject && req.user.role === 'admin') await normalizeActiveRubrics(subject, req.user._id);
  const rubrics = await Rubric.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 });
  res.json(rubrics);
};

exports.createRubric = async (req, res) => {
  const { title, criteria } = req.body;
  const subject = getSubjectId(req);
  if (!title || !criteria?.length)
    return res.status(400).json({ message: 'Title and criteria required' });
  if (!subject) return res.status(400).json({ message: 'Subject required' });
  if (!canAccessSubject(req, subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });

  // Validate criteria
  for (const c of criteria) {
    if (!c.key || !c.label || c.maxScore == null || !c.levels?.length)
      return res.status(400).json({ message: `Invalid criteria: ${c.label || c.key}` });
    for (const l of c.levels) {
      if (l.minScore < 0 || l.maxScore > c.maxScore)
        return res.status(400).json({ message: `Level scores out of range in ${c.label}` });
    }
  }

  const hasRubric = await Rubric.exists({ subject, createdBy: req.user._id });
  const rubric = await Rubric.create({ title, criteria, subject, createdBy: req.user._id, isActive: !hasRubric });
  res.status(201).json(await rubric.populate('createdBy', 'name email'));
};

exports.updateRubric = async (req, res) => {
  const existing = await Rubric.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Rubric not found' });
  if (!canAccessSubject(req, existing.subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });
  if (!canManageRubric(req, existing)) return res.status(403).json({ message: 'You can only edit rubrics you created' });
  const rubric = await Rubric.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('createdBy', 'name email');
  res.json(rubric);
};

exports.setActiveRubric = async (req, res) => {
  const existing = await Rubric.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Rubric not found' });
  if (!canAccessSubject(req, existing.subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });
  if (!canManageRubric(req, existing)) return res.status(403).json({ message: 'You can only activate rubrics you created' });
  await Rubric.updateMany({ subject: existing.subject, ...getOwnerFilter(existing.createdBy) }, { isActive: false });
  const rubric = await Rubric.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true }).populate('createdBy', 'name email');
  if (!rubric) return res.status(404).json({ message: 'Rubric not found' });
  res.json(rubric);
};

exports.deleteRubric = async (req, res) => {
  const rubric = await Rubric.findById(req.params.id);
  if (!rubric) return res.status(404).json({ message: 'Rubric not found' });
  if (!canAccessSubject(req, rubric.subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });
  if (!canManageRubric(req, rubric)) return res.status(403).json({ message: 'You can only delete rubrics you created' });

  const wasActive = rubric.isActive;
  const subject = rubric.subject;
  const ownerId = rubric.createdBy;
  await rubric.deleteOne();

  if (wasActive) {
    const replacement = await Rubric.findOne({ subject, ...getOwnerFilter(ownerId), _id: { $ne: rubric._id } }).sort({ createdAt: -1 });
    if (replacement) {
      await Rubric.updateMany({ subject, ...getOwnerFilter(ownerId) }, { isActive: false });
      replacement.isActive = true;
      await replacement.save();
    }
  }

  res.json({ message: 'Rubric deleted' });
};
