const router = require('express').Router();
const { createGroup, getGroups, getGroup, updateGroup, deleteGroup } = require('../controllers/group.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/', getGroups);
router.get('/:id', getGroup);

router.post('/', adminOnly, createGroup);
router.put('/:id', adminOnly, updateGroup);
router.delete('/:id', adminOnly, deleteGroup);

module.exports = router;
