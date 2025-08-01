
const userService = require('./user.service');
const { validationResult } = require('express-validator'); // === DÜZƏLİŞ BURADADIR ===

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const blockUser = asyncHandler(async (req, res) => {
    const blockerId = req.user.userId;
    const blockedId = req.params.id;
    await userService.blockUser(blockerId, blockedId);
    res.status(200).json({ message: 'İstifadəçi uğurla bloklandı.' });
});

const unblockUser = asyncHandler(async (req, res) => {
    const blockerId = req.user.userId;
    const blockedId = req.params.id;
    await userService.unblockUser(blockerId, blockedId);
    res.status(200).json({ message: 'İstifadəçi uğurla blokdan çıxarıldı.' });
});

const getBlockedUsers = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const blockedUsers = await userService.getBlockedUsers(userId);
    res.status(200).json(blockedUsers);
});


const reportUser = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const reporterId = req.user.userId;
        const reportedId = req.params.id;
        const { reason } = req.body;

        await userService.reportUser(reporterId, reportedId, reason);
        res.status(200).json({ message: 'Şikayətiniz uğurla göndərildi və istifadəçi avtomatik olaraq bloklandı.' });
    } catch (error) {
        // Yeni xüsusi xəta kodunu tuturuq
        if (error.statusCode === 429) {
            return res.status(429).json({ message: error.message });
        }
        // Digər xətaları mərkəzi idarəediciyə ötürürük
        next(error);
    }
});

module.exports = {
    blockUser,
    unblockUser,
    getBlockedUsers,
    reportUser,
};

