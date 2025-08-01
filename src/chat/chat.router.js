
const express = require('express');
const { getChatHistory,reportMessage } = require('./chat.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { body } = require('express-validator');

const router = express.Router();

// GET /api/chat/:connectionId/messages - Bir söhbətin tarixçəsini gətirir
router.get('/:connectionId/messages', authenticateToken, getChatHistory);
router.post(
    '/messages/:id/report',
    authenticateToken,
    [ body('reason').notEmpty().withMessage('Səbəb göstərilməlidir') ],
    reportMessage
);

module.exports = router;
