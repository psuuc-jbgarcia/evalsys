const router = require('express').Router();
const { login, getMe, changePassword } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/login', login);
router.get('/me', protect, getMe);
router.patch('/change-password', protect, changePassword);

module.exports = router;
