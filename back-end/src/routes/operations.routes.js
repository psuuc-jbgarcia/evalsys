const router = require('express').Router();
const {
  exportBackup,
  cleanupProposalOrphans,
  getActivity,
  getAuditLogs,
  getInstructorSummary,
  getProposalOrphans,
  getSecurityMonitor,
} = require('../controllers/operations.controller');
const { protect, superadminOnly } = require('../middleware/auth.middleware');

router.use(protect, superadminOnly);

router.get('/audit-logs', getAuditLogs);
router.get('/activity', getActivity);
router.get('/security', getSecurityMonitor);
router.get('/instructor-summary', getInstructorSummary);
router.get('/proposal-orphans', getProposalOrphans);
router.delete('/proposal-orphans', cleanupProposalOrphans);
router.get('/backup/:type', exportBackup);

module.exports = router;
