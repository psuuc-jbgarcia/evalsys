const Section = require('../models/Section');

const getSubjectId = (req) => req.headers['x-subject-id'] || req.query.subject || req.body.subject;
const canAccessSubject = (req, subjectId) => (
  !subjectId ||
  req.user?.role === 'superadmin' ||
  (req.user?.assignedSubjects || []).some((id) => id.toString() === subjectId.toString())
);

exports.createSection = async (req, res) => {
  const { name, block, assignedPanels } = req.body;
  const subject = getSubjectId(req);
  if (!name || !block) return res.status(400).json({ message: 'Name and block required' });
  if (!subject) return res.status(400).json({ message: 'Subject required' });
  if (!canAccessSubject(req, subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });
  const section = await Section.create({ name, block, subject, assignedPanels: assignedPanels || [] });
  res.status(201).json(section);
};

exports.getSections = async (req, res) => {
  let filter = {};
  if (req.user && req.user.role === 'panel') {
    filter = { assignedPanels: req.user._id };
  } else if (req.user) {
    const subject = getSubjectId(req);
    if (subject) {
      if (!canAccessSubject(req, subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });
      filter.subject = subject;
    } else if (req.user.role === 'admin') {
      filter.subject = { $in: req.user.assignedSubjects || [] };
    }
  }
  
  const sections = await Section.find(filter)
    .populate('assignedPanels', 'name email')
    .sort({ createdAt: -1 });
  res.json(sections);
};

exports.updateSection = async (req, res) => {
  const existing = await Section.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Section not found' });
  if (!canAccessSubject(req, existing.subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });
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
