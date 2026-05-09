const router = require('express').Router();
const {
  getActiveRubric,
  getAllRubrics,
  createRubric,
  updateRubric,
  setActiveRubric,
  deleteRubric,
} = require('../controllers/rubric.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

// Panel can read the active rubric
router.get('/active', protect, getActiveRubric);

// Admin only
router.get('/', protect, getAllRubrics);
router.post('/', protect, adminOnly, createRubric);
router.put('/:id', protect, adminOnly, updateRubric);
router.patch('/:id/activate', protect, adminOnly, setActiveRubric);
router.delete('/:id', protect, adminOnly, deleteRubric);

module.exports = router;
