const prisma = require('../config/prisma');

const activateDailyPremium = async (userId, receipt) => {
    // ADDIM 1: Google/Apple ilə qəbzi yoxla (real layihədə bu hissə RevenueCat ilə edilməlidir)
    console.log(`Qəbz yoxlanılır (simulyasiya): ${receipt} - İstifadəçi: ${userId}`);

    // ADDIM 2: İstifadəçinin premium bitmə tarixini 24 saat sonraya təyin et
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { premiumExpiresAt: oneDayFromNow },
    });

    return updatedUser;
};

module.exports = { activateDailyPremium };