const express = require('express');
const { activateDailyPremium } = require('./purchase.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/daily-premium', authenticateToken, activateDailyPremium);

module.exports = router;