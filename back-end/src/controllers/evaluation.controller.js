const Evaluation = require('../models/Evaluation');
const Group = require('../models/Group');
const Section = require('../models/Section');

// Panel: submit or update their evaluation for a group
exports.submitEvaluation = async (req, res) => {
  const { groupId } = req.params;
  const { scores, rubricId } = req.body;

  const group = await Group.findById(groupId).populate('section');
  if (!group) return res.status(404).json({ message: 'Group not found' });

  // Check section-level panel assignment
  const section = await Section.findById(group.section._id || group.section);
  const isAssigned = section && section.assignedPanels.some(
    (p) => p.toString() === req.user._id.toString()
  );

  // Fallback: also check group-level assignment for backward compatibility
  const isGroupAssigned = group.assignedPanels && group.assignedPanels.some(
    (p) => p.toString() === req.user._id.toString()
  );

  if (!isAssigned && !isGroupAssigned)
    return res.status(403).json({ message: 'You are not assigned to this group\'s section' });

  const evaluation = await Evaluation.findOneAndUpdate(
    { group: groupId, panel: req.user._id },
    { scores, rubric: rubricId, comments: req.body.comments || '', isSubmitted: true },
    { new: true, upsert: true, runValidators: true }
  );

  res.json(evaluation);
};

// Panel: get their own evaluation for a group
exports.getMyEvaluation = async (req, res) => {
  const evaluation = await Evaluation.findOne({
    group: req.params.groupId,
    panel: req.user._id,
  }).populate('rubric');
  res.json(evaluation || null);
};

// Admin: get all evaluations for a group + computed final result
exports.getGroupResult = async (req, res) => {
  const evaluations = await Evaluation.find({
    group: req.params.groupId,
    isSubmitted: true,
  }).populate('panel', 'name email').populate('rubric');

  if (!evaluations.length)
    return res.json({ evaluations: [], averaged: null, finalTotal: null });

  // Get the group to find the correct divisor (number of panels assigned to the block)
  const groupDoc = await Group.findById(req.params.groupId).populate('section');
  let divisor = evaluations.length;
  if (groupDoc) {
    if (groupDoc.section && groupDoc.section.assignedPanels && groupDoc.section.assignedPanels.length > 0) {
      divisor = groupDoc.section.assignedPanels.length;
    } else if (groupDoc.assignedPanels && groupDoc.assignedPanels.length > 0) {
      divisor = groupDoc.assignedPanels.length;
    }
  }
  if (divisor === 0) divisor = 1;

  // Dynamically collect all categories used in these evaluations
  const averaged = {};
  const categorySums = {};

  evaluations.forEach(ev => {
    if (ev.scores instanceof Map) {
      ev.scores.forEach((val, key) => {
        categorySums[key] = (categorySums[key] || 0) + val;
      });
    } else {
      // Fallback for older data structure
      for (const [key, val] of Object.entries(ev.scores)) {
        categorySums[key] = (categorySums[key] || 0) + val;
      }
    }
  });

  for (const key in categorySums) {
    averaged[key] = Math.round((categorySums[key] / divisor) * 100) / 100;
  }

  const finalTotal = Math.round(
    Object.values(averaged).reduce((a, b) => a + b, 0) * 100
  ) / 100;

  const comments = evaluations.map(ev => ({
    panel: ev.panel?.name || 'Unknown',
    text: ev.comments || ''
  })).filter(c => c.text);

  res.json({ evaluations, averaged, finalTotal, comments });
};

// Admin: get results for all groups in a section
exports.getSectionResults = async (req, res) => {
  const groups = await Group.find({ section: req.params.sectionId });
  const results = await Promise.all(
    groups.map(async (group) => {
      const evaluations = await Evaluation.find({
        group: group._id,
        isSubmitted: true,
      }).populate('panel', 'name email');

      if (!evaluations.length) return { group, averaged: null, finalTotal: null };

      // Get the group to find the correct divisor (number of panels assigned to the block)
      let divisor = evaluations.length;
      let assignedPanelDocs = [];
      const groupDoc = await Group.findById(group._id)
        .populate({ path: 'section', populate: { path: 'assignedPanels', select: 'name email' } })
        .populate('assignedPanels', 'name email');

      if (groupDoc) {
        if (groupDoc.section && groupDoc.section.assignedPanels && groupDoc.section.assignedPanels.length > 0) {
          assignedPanelDocs = groupDoc.section.assignedPanels;
          divisor = groupDoc.section.assignedPanels.length;
        } else if (groupDoc.assignedPanels && groupDoc.assignedPanels.length > 0) {
          assignedPanelDocs = groupDoc.assignedPanels;
          divisor = groupDoc.assignedPanels.length;
        }
      }
      if (divisor === 0) divisor = 1;

      // Determine who has NOT evaluated yet
      const evaluatedPanelIds = evaluations.map(ev => ev.panel?._id?.toString() || '');
      const missingPanels = assignedPanelDocs
        .filter(p => p && !evaluatedPanelIds.includes(p._id.toString()))
        .map(p => p.name || 'Unknown');

      const isIncomplete = missingPanels.length > 0;

      const averaged = {};
      const categorySums = {};

      evaluations.forEach(ev => {
        if (ev.scores instanceof Map) {
          ev.scores.forEach((val, key) => {
            categorySums[key] = (categorySums[key] || 0) + val;
          });
        } else {
          for (const [key, val] of Object.entries(ev.scores)) {
            categorySums[key] = (categorySums[key] || 0) + val;
          }
        }
      });

      for (const key in categorySums) {
        averaged[key] = Math.round((categorySums[key] / divisor) * 100) / 100;
      }

      const finalTotal = Math.round(Object.values(averaged).reduce((a, b) => a + b, 0) * 100) / 100;
      const evaluatedBy = evaluations.map(ev => ev.panel?.name || 'Unknown');
      const comments = evaluations.map(ev => ({
        panel: ev.panel?.name || 'Unknown',
        text: ev.comments || ''
      })).filter(c => c.text);

      return { group, averaged, finalTotal, evaluatedBy, missingPanels, isIncomplete, comments };
    })
  );
  res.json(results);
};
