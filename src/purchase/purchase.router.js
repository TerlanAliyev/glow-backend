const express = require('express');
const { activateDailyPremium,activateSubscription  } = require('./purchase.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/daily-premium', authenticateToken, activateDailyPremium);
router.post('/subscription', authenticateToken, activateSubscription);

module.exports = router;