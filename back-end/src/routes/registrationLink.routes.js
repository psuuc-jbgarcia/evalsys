const router = require('express').Router();
const {
  getRegistrationLinks,
  createRegistrationLink,
  updateRegistrationLink,
  getPublicRegistrationLink,
  registerGroupWithLink,
} = require('../controllers/registrationLink.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.get('/public/:token', getPublicRegistrationLink);
router.post('/public/:token/register', registerGroupWithLink);

router.use(protect, adminOnly);

router.get('/', getRegistrationLinks);
router.post('/', createRegistrationLink);
router.patch('/:id', updateRegistrationLink);

module.exports = router;
