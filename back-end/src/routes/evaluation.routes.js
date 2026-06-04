const router = require('express').Router();
const {
  submitEvaluation,
  getMyEvaluation,
  getGroupResult,
  getSectionResults,
  clearEvaluation,
} = require('../controllers/evaluation.controller');
const { protect, adminOnly, panelOnly, superadminInstructorContext } = require('../middleware/auth.middleware');
const { validateScores } = require('../middleware/validate.middleware');

const superadminContextForSelectedSubject = (req, res, next) => {
  const subject = req.headers['x-subject-id'] || req.query.subject || req.body?.subject;
  if (subject) return superadminInstructorContext(req, res, next);
  next();
};

// Panel routes
router.post('/group/:groupId', protect, panelOnly, validateScores, submitEvaluation);
router.get('/group/:groupId/mine', protect, panelOnly, getMyEvaluation);

// Admin routes
router.get('/group/:groupId/result', protect, adminOnly, superadminInstructorContext, getGroupResult);
router.get('/section/:sectionId/results', protect, adminOnly, superadminInstructorContext, getSectionResults);
router.get('/export-all', protect, adminOnly, superadminContextForSelectedSubject, require('../controllers/evaluation.controller').exportAllResults);
router.post(
  '/master-reset',
  protect,
  adminOnly,
  superadminContextForSelectedSubject,
  require('../controllers/evaluation.controller').masterReset
);
router.delete('/:evaluationId', protect, adminOnly, superadminInstructorContext, clearEvaluation);

module.exports = router;
