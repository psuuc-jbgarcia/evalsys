const router = require('express').Router();
const { getSettings, toggleGradingLock } = require('../controllers/settings.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.get('/', protect, getSettings);
router.patch('/toggle-lock', protect, adminOnly, toggleGradingLock);

module.exports = router;
