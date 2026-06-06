const router = require('express').Router();
const {
  getSettings,
  getPublicSettings,
  toggleGradingLock,
  toggleCsvExportLock,
  updateSystemControls,
} = require('../controllers/settings.controller');
const { protect, adminOnly, superadminOnly } = require('../middleware/auth.middleware');

router.get('/public', getPublicSettings);
router.get('/', protect, getSettings);
router.patch('/toggle-lock', protect, adminOnly, toggleGradingLock);
router.patch('/toggle-csv-lock', protect, superadminOnly, toggleCsvExportLock);
router.patch('/system-controls', protect, superadminOnly, updateSystemControls);

module.exports = router;
