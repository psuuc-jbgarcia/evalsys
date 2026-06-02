const router = require('express').Router();
const { createUser, getUsers, toggleActive, deleteUser, bulkCreateUsers, resetPassword, updateSubjectLimit } = require('../controllers/user.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.use(protect, adminOnly);
router.post('/', createUser);
router.post('/bulk', bulkCreateUsers);
router.get('/', getUsers);
router.patch('/:id/toggle', toggleActive);
router.patch('/:id/reset-password', resetPassword);
router.patch('/:id/subject-limit', updateSubjectLimit);
router.delete('/:id', deleteUser);

module.exports = router;
