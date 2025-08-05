
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

//Premium function to get profile and log view
const getUserProfile = asyncHandler(async (req, res) => {
    const targetUserId = req.params.id;
    const viewerId = req.user.userId;
    const userProfile = await userService.getProfileAndLogView(targetUserId, viewerId);
    res.status(200).json(userProfile);
});

const deleteMe = asyncHandler(async (req, res) => {
    const { otp } = req.body;
    if (!otp) {
        return res.status(400).json({ message: 'Təsdiq kodu (otp) təqdim edilməlidir.' });
    }
    const userId = req.user.userId;
    await userService.deleteOwnAccount(userId, otp);
    res.status(200).json({ message: 'Hesabınız və bütün məlumatlarınız uğurla silindi.' });
});

const initiateDeleteMe = asyncHandler(async (req, res) => {
    await userService.initiateAccountDeletion(req.user.userId);
    res.status(200).json({ message: 'Əgər hesabınız mövcuddursa, hesabınızı silmək üçün təsdiq kodu e-poçt ünvanınıza göndərildi.' });
});
const getMyHistory = asyncHandler(async (req, res) => {
    const history = await userService.getCheckInHistory(req.user.userId, req.query);
    res.status(200).json(history);
});

const deleteMyHistory = asyncHandler(async (req, res) => {
    await userService.deleteCheckInHistory(req.user.userId);
    res.status(200).json({ message: 'Məkan tarixçəniz uğurla təmizləndi.' });
});
module.exports = {
    blockUser,
    unblockUser,
    getBlockedUsers,
    reportUser,
    getUserProfile,
    deleteMe,
    initiateDeleteMe,
    getMyHistory,
    deleteMyHistory
};

