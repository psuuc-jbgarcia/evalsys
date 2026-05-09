const Rubric = require('../models/Rubric');

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

// Get active rubric (or seed default if none exists)
exports.getActiveRubric = async (req, res) => {
  let rubric = await Rubric.findOne({ isActive: true });
  if (!rubric) {
    rubric = await Rubric.create({ ...DEFAULT_RUBRIC, isActive: true });
  }
  res.json(rubric);
};

exports.getAllRubrics = async (req, res) => {
  const rubrics = await Rubric.find().sort({ createdAt: -1 });
  res.json(rubrics);
};

exports.createRubric = async (req, res) => {
  const { title, criteria } = req.body;
  if (!title || !criteria?.length)
    return res.status(400).json({ message: 'Title and criteria required' });

  // Validate criteria
  for (const c of criteria) {
    if (!c.key || !c.label || c.maxScore == null || !c.levels?.length)
      return res.status(400).json({ message: `Invalid criteria: ${c.label || c.key}` });
    for (const l of c.levels) {
      if (l.minScore < 0 || l.maxScore > c.maxScore)
        return res.status(400).json({ message: `Level scores out of range in ${c.label}` });
    }
  }

  const rubric = await Rubric.create({ title, criteria });
  res.status(201).json(rubric);
};

exports.updateRubric = async (req, res) => {
  const rubric = await Rubric.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!rubric) return res.status(404).json({ message: 'Rubric not found' });
  res.json(rubric);
};

exports.setActiveRubric = async (req, res) => {
  await Rubric.updateMany({}, { isActive: false });
  const rubric = await Rubric.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
  if (!rubric) return res.status(404).json({ message: 'Rubric not found' });
  res.json(rubric);
};

exports.deleteRubric = async (req, res) => {
  const rubric = await Rubric.findById(req.params.id);
  if (!rubric) return res.status(404).json({ message: 'Rubric not found' });
  if (rubric.isActive) return res.status(400).json({ message: 'Cannot delete the active rubric' });
  await rubric.deleteOne();
  res.json({ message: 'Rubric deleted' });
};
