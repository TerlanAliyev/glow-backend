const challengeService = require('./challenge.service');
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const getTemplates = asyncHandler(async (req, res) => {
    const templates = await challengeService.getActiveTemplates();
    res.status(200).json(templates);
});

const createNewChallenge = asyncHandler(async (req, res) => {
    const challengerId = req.user.userId;
    const newChallenge = await challengeService.createChallenge(challengerId, req.body);
    // TODO: Qarşı tərəfə real-zamanlı bildiriş göndər
    res.status(201).json(newChallenge);
});

const respond = asyncHandler(async (req, res) => {
    const userId = req.user.userId; // Təklifə cavab verən şəxs
    const { id } = req.params;
    const { response } = req.body; // "ACCEPTED" və ya "DECLINED"

    if (!['ACCEPTED', 'DECLINED'].includes(response)) {
        return res.status(400).json({ message: 'Cavab yalnız ACCEPTED və ya DECLINED ola bilər.' });
    }

    const updatedChallenge = await challengeService.respondToChallenge(userId, id, response);
    // TODO: Təklifi göndərənə cavab haqqında real-zamanlı bildiriş göndər
    res.status(200).json(updatedChallenge);
});

const getMy = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const challenges = await challengeService.getMyChallenges(userId);
    res.status(200).json(challenges);
});

module.exports = {
    getTemplates,
    createNewChallenge,
    respond,
    getMy,
};