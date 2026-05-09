const router = require('express').Router();
const {
  createSection,
  getSections,
  updateSection,
  deleteSection,
  assignBlocksToPanel
} = require('../controllers/section.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', getSections);
router.post('/assign-blocks', adminOnly, assignBlocksToPanel);
router.post('/', adminOnly, createSection);
router.put('/:id', adminOnly, updateSection);
router.delete('/:id', adminOnly, deleteSection);

module.exports = router;
