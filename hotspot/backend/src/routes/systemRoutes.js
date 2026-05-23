const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getHealth } = require('../controllers/systemHealthController');

router.get('/health', auth, authorize(['super_admin']), getHealth);

module.exports = router;
