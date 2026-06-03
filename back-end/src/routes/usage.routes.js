const router = require('express').Router();
const { getPlatformUsage } = require('../controllers/usage.controller');
const { protect, superadminOnly } = require('../middleware/auth.middleware');

router.get('/', protect, superadminOnly, getPlatformUsage);

module.exports = router;
