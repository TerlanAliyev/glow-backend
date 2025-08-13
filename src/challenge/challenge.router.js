const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { getTemplates, createNewChallenge, respond, getMy } = require('./challenge.controller');

const router = express.Router();

// Bütün aktiv təklif şablonlarını gətirir
router.get('/challenges/templates', authenticateToken, getTemplates);

// Hazırkı istifadəçinin bütün təkliflərini gətirir
router.get('/challenges/me', authenticateToken, getMy);

// Yeni bir görüş təklifi yaradır
router.post('/challenges', authenticateToken, createNewChallenge);

// Bir təklifə cavab verir (qəbul/rədd)
router.patch('/challenges/:id/respond', authenticateToken, respond);

module.exports = router;