const router = require('express').Router();
const {
  getRegistrationLinks,
  createRegistrationLink,
  updateRegistrationLink,
  deleteRegistrationLink,
  getPublicRegistrationLink,
  registerGroupWithLink,
} = require('../controllers/registrationLink.controller');
const { protect, adminOnly, superadminInstructorContext } = require('../middleware/auth.middleware');
const proposalUpload = require('../middleware/proposalUpload.middleware');

router.get('/public/:token', getPublicRegistrationLink);
router.post('/public/:token/register', proposalUpload, registerGroupWithLink);

router.use(protect, adminOnly, superadminInstructorContext);

router.get('/', getRegistrationLinks);
router.post('/', createRegistrationLink);
router.patch('/:id', updateRegistrationLink);
router.delete('/:id', deleteRegistrationLink);

module.exports = router;
