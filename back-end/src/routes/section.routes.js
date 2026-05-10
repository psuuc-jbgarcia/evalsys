const router = require('express').Router();
const {
  createSection,
  getSections,
  updateSection,
  deleteSection,
  assignBlocksToPanel
} = require('../controllers/section.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.get('/public', getSections); // Allow public to see blocks for registration

router.use(protect);

router.get('/', getSections);
router.post('/assign-blocks', adminOnly, assignBlocksToPanel);
router.post('/', adminOnly, createSection);
router.put('/:id', adminOnly, updateSection);
router.delete('/:id', adminOnly, deleteSection);

module.exports = router;
