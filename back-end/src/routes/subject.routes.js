const router = require('express').Router();
const { migrateDefaultSubject } = require('../controllers/subject.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.post('/migrate-default', protect, adminOnly, migrateDefaultSubject);

module.exports = router;
