const express = require('express');
const { getAdminStats, recordVisit } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/', protect, admin, getAdminStats);
router.post('/visit', recordVisit);

module.exports = router;
