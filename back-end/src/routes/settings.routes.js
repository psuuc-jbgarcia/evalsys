const router = require('express').Router();
const { getSettings, toggleGradingLock, toggleCsvExportLock, updateMaxSubjects } = require('../controllers/settings.controller');
const { protect, adminOnly, superadminOnly } = require('../middleware/auth.middleware');

router.get('/', protect, getSettings);
router.patch('/toggle-lock', protect, adminOnly, toggleGradingLock);
router.patch('/toggle-csv-lock', protect, superadminOnly, toggleCsvExportLock);
router.patch('/max-subjects', protect, superadminOnly, updateMaxSubjects);

module.exports = router;
