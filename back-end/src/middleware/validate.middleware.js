const Rubric = require('../models/Rubric');

const clamp = (val, min, max) => Math.min(Math.max(Math.round(val), min), max);

const validateScores = async (req, res, next) => {
  const { scores } = req.body;
  if (!scores) return res.status(400).json({ message: 'Scores are required' });

  // Load active rubric to get dynamic max values
  const rubric = await Rubric.findOne({ isActive: true });
  if (!rubric) return res.status(500).json({ message: 'No active rubric found' });

  for (const criteria of rubric.criteria) {
    const { key, maxScore } = criteria;
    if (scores[key] === undefined || scores[key] === null) {
      return res.status(400).json({ message: `Missing score: ${key}` });
    }
    const val = Number(scores[key]);
    if (!Number.isFinite(val) || val < 0) {
      return res.status(400).json({ message: `Invalid value for ${key}` });
    }
    scores[key] = clamp(val, 0, maxScore);
  }

  req.body.scores = scores;
  next();
};

module.exports = { validateScores };
