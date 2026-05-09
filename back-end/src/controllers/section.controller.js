const Section = require('../models/Section');

exports.createSection = async (req, res) => {
  const { name, block, assignedPanels } = req.body;
  if (!name || !block) return res.status(400).json({ message: 'Name and block required' });
  const section = await Section.create({ name, block, assignedPanels: assignedPanels || [] });
  res.status(201).json(section);
};

exports.getSections = async (req, res) => {
  let filter = {};
  if (req.user.role === 'panel') {
    filter = { assignedPanels: req.user._id };
  }
  
  const sections = await Section.find(filter)
    .populate('assignedPanels', 'name email')
    .sort({ createdAt: -1 });
  res.json(sections);
};

exports.updateSection = async (req, res) => {
  const section = await Section.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .populate('assignedPanels', 'name email');
  if (!section) return res.status(404).json({ message: 'Section not found' });
  res.json(section);
};

exports.deleteSection = async (req, res) => {
  await Section.findByIdAndDelete(req.params.id);
  res.json({ message: 'Section deleted' });
};

exports.assignBlocksToPanel = async (req, res) => {
  const { panelId, sectionIds } = req.body;
  if (!panelId || !Array.isArray(sectionIds)) {
    return res.status(400).json({ message: 'panelId and sectionIds array required' });
  }

  // First, remove this panel from all sections
  await Section.updateMany(
    { assignedPanels: panelId },
    { $pull: { assignedPanels: panelId } }
  );

  // Then, add this panel to the selected sections
  if (sectionIds.length > 0) {
    await Section.updateMany(
      { _id: { $in: sectionIds } },
      { $addToSet: { assignedPanels: panelId } }
    );
  }

  res.json({ message: 'Panel assignments updated successfully' });
};
