const express = require('express');
const { grantReward } = require('./rewards.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/grant', authenticateToken, grantReward);

module.exports = router;