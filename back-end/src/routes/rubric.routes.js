const router = require('express').Router();
const {
  getActiveRubric,
  getAllRubrics,
  createRubric,
  updateRubric,
  setActiveRubric,
  deleteRubric,
} = require('../controllers/rubric.controller');
const { protect, instructorOnly, instructorOrPanelOnly } = require('../middleware/auth.middleware');

// Panel can read the active rubric
router.get('/active', protect, instructorOrPanelOnly, getActiveRubric);

// Instructor only. Super Admin does not manage grading rubrics.
router.get('/', protect, instructorOnly, getAllRubrics);
router.post('/', protect, instructorOnly, createRubric);
router.put('/:id', protect, instructorOnly, updateRubric);
router.patch('/:id/activate', protect, instructorOnly, setActiveRubric);
router.delete('/:id', protect, instructorOnly, deleteRubric);

module.exports = router;
