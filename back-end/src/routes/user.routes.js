const router = require('express').Router();
const { createUser, getUsers, toggleActive, deleteUser } = require('../controllers/user.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.use(protect, adminOnly);
router.post('/', createUser);
router.get('/', getUsers);
router.patch('/:id/toggle', toggleActive);
router.delete('/:id', deleteUser);

module.exports = router;
