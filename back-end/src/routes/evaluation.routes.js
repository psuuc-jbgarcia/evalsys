const router = require('express').Router();
const {
  submitEvaluation,
  getMyEvaluation,
  getGroupResult,
  getSectionResults,
} = require('../controllers/evaluation.controller');
const { protect, adminOnly, panelOnly } = require('../middleware/auth.middleware');
const { validateScores } = require('../middleware/validate.middleware');

// Panel routes
router.post('/group/:groupId', protect, panelOnly, validateScores, submitEvaluation);
router.get('/group/:groupId/mine', protect, panelOnly, getMyEvaluation);

// Admin routes
router.get('/group/:groupId/result', protect, adminOnly, getGroupResult);
router.get('/section/:sectionId/results', protect, adminOnly, getSectionResults);
router.get('/export-all', protect, adminOnly, require('../controllers/evaluation.controller').exportAllResults);
router.post('/master-reset', protect, adminOnly, require('../controllers/evaluation.controller').masterReset);

module.exports = router;
