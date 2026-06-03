const Section = require('../models/Section');
const Admin = require('../models/Admin');
const Panel = require('../models/Panel');

const getSubjectId = (req) => req.headers['x-subject-id'] || req.query.subject || req.body.subject;
const canAccessSubject = (req, subjectId) => (
  !subjectId ||
  req.user?.role === 'superadmin' ||
  (req.user?.assignedSubjects || []).some((id) => id.toString() === subjectId.toString())
);

const validatePanelAssignments = async (req, panelIds = [], subject) => {
  if (!Array.isArray(panelIds) || !panelIds.length) return null;

  const uniquePanelIds = [...new Set(panelIds.map((id) => id.toString()))];
  const panels = await Panel.find({ _id: { $in: uniquePanelIds }, isActive: true }).select('name createdBy');
  if (panels.length !== uniquePanelIds.length) {
    return 'One or more selected panels are inactive or missing';
  }

  for (const panel of panels) {
    if (req.user.role === 'admin' && panel.createdBy && panel.createdBy.toString() !== req.user._id.toString()) {
      return `${panel.name} belongs to another instructor`;
    }

    if (panel.createdBy) {
      const owner = await Admin.findOne({
        _id: panel.createdBy,
        role: 'admin',
        isActive: true,
        assignedSubjects: subject,
      }).select('_id');
      if (!owner) return `${panel.name}'s instructor is not assigned to this subject`;
    }
  }

  return null;
};

exports.createSection = async (req, res) => {
  const { name, block, assignedPanels } = req.body;
  const subject = getSubjectId(req);
  if (!name || !block) return res.status(400).json({ message: 'Name and block required' });
  if (!subject) return res.status(400).json({ message: 'Subject required' });
  if (!canAccessSubject(req, subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });
  const assignmentError = await validatePanelAssignments(req, assignedPanels, subject);
  if (assignmentError) return res.status(400).json({ message: assignmentError });
  const section = await Section.create({ name, block, subject, assignedPanels: assignedPanels || [] });
  res.status(201).json(section);
};

exports.getSections = async (req, res) => {
  let filter = {};
  const subject = req.user ? getSubjectId(req) : req.query.subject;

  if (!req.user && subject) {
    filter.subject = subject;
  } else if (req.user && req.user.role === 'panel') {
    filter = { assignedPanels: req.user._id };
    if (req.user.createdBy) {
      const instructor = await Admin.findOne({ _id: req.user.createdBy, role: 'admin', isActive: true }).select('assignedSubjects');
      if (!instructor) return res.json([]);
      filter.subject = { $in: instructor.assignedSubjects || [] };
    }
  } else if (req.user) {
    if (subject) {
      if (!canAccessSubject(req, subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });
      filter.subject = subject;
    } else if (req.user.role === 'admin') {
      filter.subject = { $in: req.user.assignedSubjects || [] };
    }
  }
  
  const sections = await Section.find(filter)
    .populate('assignedPanels', 'name email')
    .populate('subject', 'code title')
    .sort({ createdAt: -1 });
  res.json(sections);
};

exports.updateSection = async (req, res) => {
  const existing = await Section.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Section not found' });
  if (!canAccessSubject(req, existing.subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });
  if (req.body.assignedPanels) {
    const assignmentError = await validatePanelAssignments(req, req.body.assignedPanels, existing.subject);
    if (assignmentError) return res.status(400).json({ message: assignmentError });
  }
  const section = await Section.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .populate('assignedPanels', 'name email');
  res.json(section);
};

exports.deleteSection = async (req, res) => {
  const section = await Section.findById(req.params.id);
  if (!section) return res.status(404).json({ message: 'Section not found' });
  if (!canAccessSubject(req, section.subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });
  await section.deleteOne();
  res.json({ message: 'Section deleted' });
};

exports.assignBlocksToPanel = async (req, res) => {
  const { panelId, sectionIds } = req.body;
  if (!panelId || !Array.isArray(sectionIds)) {
    return res.status(400).json({ message: 'panelId and sectionIds array required' });
  }
  const subject = getSubjectId(req);
  if (!subject) return res.status(400).json({ message: 'Subject required' });
  if (!canAccessSubject(req, subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });

  const panel = await Panel.findById(panelId).select('createdBy isActive');
  if (!panel || !panel.isActive) {
    return res.status(404).json({ message: 'Panel account not found or inactive' });
  }

  if (req.user.role === 'admin' && panel.createdBy && panel.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'This panel belongs to another instructor' });
  }

  if (panel.createdBy) {
    const owner = await Admin.findOne({
      _id: panel.createdBy,
      role: 'admin',
      isActive: true,
      assignedSubjects: subject,
    }).select('_id');
    if (!owner) {
      return res.status(400).json({ message: 'This panel owner is not assigned to the selected subject' });
    }
  }

  // First, remove this panel from all sections in the selected subject
  await Section.updateMany(
    { assignedPanels: panelId, subject },
    { $pull: { assignedPanels: panelId } }
  );

  // Then, add this panel to the selected sections
  if (sectionIds.length > 0) {
    await Section.updateMany(
      { _id: { $in: sectionIds }, subject },
      { $addToSet: { assignedPanels: panelId } }
    );
  }

  res.json({ message: 'Panel assignments updated successfully' });
};
