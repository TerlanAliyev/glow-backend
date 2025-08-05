const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { getUserBadges } = require('./gamification.controller');

const router = express.Router();

// Bir istifadəçinin qazandığı bütün nişanları gətirir
router.get('/users/:userId/badges', authenticateToken, getUserBadges);

module.exports = router;