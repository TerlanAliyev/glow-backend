const prisma = require('../config/prisma');

const grantExtraSignals = async (userId, amount) => {
    // İstifadəçinin profilinə verilən miqdarda kredit əlavə edirik
    return prisma.profile.update({
        where: { userId },
        data: {
            extraSignalCredits: {
                increment: amount
            }
        }
    });
};

module.exports = { grantExtraSignals };