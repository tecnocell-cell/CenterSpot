const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getHealth } = require('../controllers/systemHealthController');

// GET /api/system/health — super admin (SystemHealth.jsx)
router.use(auth, authorize('super_admin'));
router.get('/health', getHealth);

module.exports = router;
