const router = require('express').Router();
const {
  getLegacyData,
  deleteLegacyGroup,
  deleteLegacyPanel,
  deleteLegacyResult,
  deleteAllLegacyResults,
  deleteLegacySection,
} = require('../controllers/legacyData.controller');
const { protect, superadminOnly } = require('../middleware/auth.middleware');

router.use(protect, superadminOnly);
router.get('/', getLegacyData);
router.delete('/groups/:id', deleteLegacyGroup);
router.delete('/panels/:id', deleteLegacyPanel);
router.delete('/results', deleteAllLegacyResults);
router.delete('/results/:id', deleteLegacyResult);
router.delete('/sections/:id', deleteLegacySection);

module.exports = router;
