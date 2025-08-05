
const express = require('express');
const { blockUser, unblockUser, getBlockedUsers,reportUser, getUserProfile,deleteMe
    ,initiateDeleteMe,getMyHistory,deleteMyHistory
 } = require('./user.controller');
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
router.delete('/me', authenticateToken, deleteMe);
router.post('/me/initiate-deletion', authenticateToken, initiateDeleteMe);
router.get('/me/history', authenticateToken, getMyHistory);
router.delete('/me/history', authenticateToken, deleteMyHistory);


// Premium function to get user profile and log view
router.get('/:id/profile', authenticateToken, getUserProfile);
module.exports = router;