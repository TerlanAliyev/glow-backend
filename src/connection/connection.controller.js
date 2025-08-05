
const connectionService = require('./connection.service');

// Xətaları mərkəzi errorHandler-a ötürmək üçün köməkçi funksiya
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const unmatchUser = asyncHandler(async (req, res, next) => {
    const userId = req.user.userId;
    const connectionId = parseInt(req.params.id);

    // ID-nin düzgün formatda olub-olmadığını yoxlayırıq
    if (isNaN(connectionId)) {
        return res.status(400).json({ message: 'Bağlantı ID-si düzgün formatda deyil.' });
    }

    // === DÜZƏLİŞ BURADADIR ===
    // Artıq `try/catch` bloku yoxdur. `asyncHandler` bütün xətaları
    // avtomatik olaraq tutub mərkəzi `errorHandler`-a ötürəcək.
    // Bu, "ReferenceError: next is not defined" xətasını həll edir.
    await connectionService.unmatchUser(userId, connectionId);
    res.status(200).json({ message: 'Bağlantı uğurla silindi.' });
});

const getMyConnections = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const connections = await connectionService.getConnectionsForUser(userId, { page: parseInt(page), limit: parseInt(limit) });
    res.status(200).json(connections);
});

module.exports = {
    unmatchUser,
    getMyConnections,
};
