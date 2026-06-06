const router = require('express').Router();
const {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  assignSubjectAdmins,
  getPublicSubjects,
} = require('../controllers/subject.controller');
const { protect, adminOnly, superadminOnly } = require('../middleware/auth.middleware');

router.get('/public', getPublicSubjects);

router.get('/', protect, adminOnly, getSubjects);
router.post('/', protect, adminOnly, createSubject);
router.put('/:id', protect, adminOnly, updateSubject);
router.put('/:id/admins', protect, superadminOnly, assignSubjectAdmins);
router.delete('/:id', protect, superadminOnly, deleteSubject);

module.exports = router;
