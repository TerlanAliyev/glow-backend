
const express = require('express');
const { blockUser, unblockUser, getBlockedUsers,reportUser } = require('./user.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { body } = require('express-validator');

const router = express.Router();

// GET /api/users/blocked - Bloklanmış istifadəçilərin siyahısını gətirir
router.get('/blocked', authenticateToken, getBlockedUsers);

// POST /api/users/:id/block - Bir istifadəçini bloklayır
router.post('/:id/block', authenticateToken, blockUser);

// DELETE /api/users/:id/unblock - Bir istifadəçini blokdan çıxarır
router.delete('/:id/unblock', authenticateToken, unblockUser);

router.post(
    '/:id/report',
    authenticateToken,
    [ body('reason').notEmpty().withMessage('Şikayət üçün səbəb göstərilməlidir.') ],
    reportUser
);
module.exports = router;