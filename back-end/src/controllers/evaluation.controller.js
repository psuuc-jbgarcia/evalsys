const Evaluation = require('../models/Evaluation');
const Group = require('../models/Group');
const Section = require('../models/Section');
const Settings = require('../models/Settings');

const scoresToObject = (scores) => {
  if (!scores) return {};
  if (scores instanceof Map) return Object.fromEntries(scores);
  return scores;
};

const serializeEvaluation = (evaluation) => {
  if (!evaluation) return null;
  const obj = evaluation.toObject ? evaluation.toObject() : evaluation;
  return {
    ...obj,
    scores: scoresToObject(evaluation.scores),
  };
};

// Admin: Clear (delete) a single evaluation record
exports.clearEvaluation = async (req, res) => {
  const { evaluationId } = req.params;
  try {
    const evaluation = await Evaluation.findByIdAndDelete(evaluationId);
    if (!evaluation) return res.status(404).json({ message: 'Evaluation not found' });
    res.json({ message: 'Evaluation cleared successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear evaluation', error: err.message });
  }
};

// Panel: submit or update their evaluation for a group
exports.submitEvaluation = async (req, res) => {
  const { groupId } = req.params;
  const { scores, rubricId } = req.body;

  // Global Lock Check - Panels are restricted when locked, Admins can bypass
  const settings = await Settings.findOne();
  if (settings && settings.isGradingLocked && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Grading is currently locked by administrator' });
  }


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

  const total = Object.values(scores).reduce((sum, val) => sum + Number(val || 0), 0);

  const evaluation = await Evaluation.findOneAndUpdate(
    { group: groupId, panel: req.user._id },
    { scores, total, rubric: rubricId, comments: req.body.comments || '', isSubmitted: true },
    { new: true, upsert: true, runValidators: true }
  );

  res.json(serializeEvaluation(evaluation));
};

// Panel: get their own evaluation for a group
exports.getMyEvaluation = async (req, res) => {
  const evaluation = await Evaluation.findOne({
    group: req.params.groupId,
    panel: req.user._id,
  }).populate('rubric');
  res.json(serializeEvaluation(evaluation));
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

      // if (!evaluations.length) return { group, averaged: null, finalTotal: null };

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

      const hasEvaluations = evaluations.length > 0;
      const averaged = hasEvaluations ? {} : null;
      const categorySums = {};

      if (hasEvaluations) {
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
      }

      const finalTotal = hasEvaluations 
        ? Math.round(Object.values(averaged).reduce((a, b) => a + b, 0) * 100) / 100
        : null;

      const evaluatedBy = evaluations.map(ev => ev.panel?.name || 'Unknown');
      const comments = evaluations.map(ev => ({
        panel: ev.panel?.name || 'Unknown',
        text: ev.comments || ''
      })).filter(c => c.text);

      const evaluationRecords = evaluations.map(ev => ({
        _id: ev._id,
        panelId: ev.panel?._id,
        panelName: ev.panel?.name || 'Unknown',
      }));

      return { group, averaged, finalTotal, evaluatedBy, missingPanels, isIncomplete, comments, evaluationRecords };
    })
  );
  res.json(results);
};

// Admin: Export ALL results from ALL sections for archiving
exports.exportAllResults = async (req, res) => {
  const sections = await Section.find();
  const allResults = [];

  for (const section of sections) {
    const groups = await Group.find({ section: section._id });
    for (const group of groups) {
      const evaluations = await Evaluation.find({ group: group._id, isSubmitted: true }).populate('panel', 'name');
      
      if (evaluations.length === 0) continue;

      let totalScore = 0;
      evaluations.forEach(ev => {
        const scores = ev.scores instanceof Map ? Object.fromEntries(ev.scores) : ev.scores;
        totalScore += Object.values(scores).reduce((a, b) => a + b, 0);
      });

      const avgScore = Math.round((totalScore / (section.assignedPanels.length || evaluations.length)) * 100) / 100;

      allResults.push({
        Section: section.block,
        GroupName: group.name,
        Members: group.members.join('; '),
        AverageScore: avgScore,
        EvaluatedBy: evaluations.map(ev => ev.panel?.name).join(', '),
        Comments: evaluations.map(ev => ev.comments).filter(Boolean).join(' | ')
      });
    }
  }

  res.json(allResults);
};

// Admin: Master Reset - Wipe all event data
exports.masterReset = async (req, res) => {
  const { confirmText } = req.body;
  if (confirmText !== 'RESET') {
    return res.status(400).json({ message: 'Invalid confirmation text' });
  }

  try {
    await Evaluation.deleteMany({});
    await Group.deleteMany({});
    await Section.deleteMany({});
    // We keep Users (Admins/Panels) and Rubrics (usually reused)
    // But we could also delete Rubrics if preferred. 
    // Let's stick to event data: Evaluations, Groups, Sections.
    
    res.json({ message: 'System has been master reset successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Reset failed', error: err.message });
  }
};
