
const express = require('express');
const { submitFeedback } = require('./feedback.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const upload = require('../upload/upload.service'); // Mövcud upload servisimizi istifadə edirik

const router = express.Router();

// POST /api/feedback - Yeni bir rəy göndərir
router.post(
    '/',
    authenticateToken,
    upload.single('screenshot'), // "screenshot" adlı tək bir fayl qəbul edir
    submitFeedback
);

module.exports = router;