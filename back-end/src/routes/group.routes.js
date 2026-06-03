const router = require('express').Router();
const { createGroup, getGroups, getGroup, updateGroup, deleteGroup, bulkCreateGroups } = require('../controllers/group.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.post('/register', (_req, res) => {
  res.status(403).json({ message: 'Registration requires an instructor registration link.' });
});

router.use(protect);
router.get('/', getGroups);
router.get('/:id', getGroup);

router.post('/', adminOnly, createGroup);
router.post('/bulk', adminOnly, bulkCreateGroups);
router.put('/:id', adminOnly, updateGroup);
router.delete('/:id', adminOnly, deleteGroup);

module.exports = router;
