const router = require('express').Router();
const {
  exportBackup,
  getActivity,
  getAuditLogs,
  getInstructorSummary,
  getProposalOrphans,
} = require('../controllers/operations.controller');
const { protect, superadminOnly } = require('../middleware/auth.middleware');

router.use(protect, superadminOnly);

router.get('/audit-logs', getAuditLogs);
router.get('/activity', getActivity);
router.get('/instructor-summary', getInstructorSummary);
router.get('/proposal-orphans', getProposalOrphans);
router.get('/backup/:type', exportBackup);

module.exports = router;
