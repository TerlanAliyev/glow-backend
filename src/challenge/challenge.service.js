const prisma = require('../config/prisma');
const { createAndSendNotification } = require('../notification/notification.service'); // <-- YENİ İMPORT
const gamificationService = require('../gamification/gamification.service'); // <-- YENİ İMPORT

// İstifadəçilərə təklif göndərmək üçün aktiv şablonları gətirir
const getActiveTemplates = () => {
    return prisma.challengeTemplate.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
    });
};

// Yeni bir görüş təklifi yaradır
const createChallenge = async (challengerId, data) => {
    const { challengedId, connectionId, venueId, challengeTime, templateId } = data;

    // 1. Təklifi BİR DƏFƏ yaradırıq və göndərənin məlumatlarını da cavaba daxil edirik
    const newChallenge = await prisma.challengeInstance.create({
        data: {
            challengerId,
            challengedId,
            connectionId: Number(connectionId),
            venueId: Number(venueId),
            templateId: Number(templateId),
            challengeTime: new Date(challengeTime),
        },
        include: {
            challenger: { include: { profile: { select: { name: true } } } } // Yalnız lazımlı sahəni götürürük
        }
    });

    // 2. Təklif uğurla yaranıbsa, bildiriş göndəririk
    if (newChallenge) {
        await createAndSendNotification(
            newChallenge.challengedId,
            'NEW_CHALLENGE',
            `${newChallenge.challenger.profile.name} sizə yeni bir görüş təklifi göndərdi!`,
            { challengeId: newChallenge.id.toString() }
        );
    }
    
    // 3. Yaratdığımız təklifi geri qaytarırıq
    return newChallenge;
};

// Mövcud bir təklifə cavab vermək (qəbul/rədd)
const respondToChallenge = async (userId, challengeId, response) => {
    // 1. Əvvəlcə təklifin mövcudluğunu və cavab vermək üçün icazənin olub-olmadığını yoxlayırıq
    const challenge = await prisma.challengeInstance.findFirst({
        where: { 
            id: Number(challengeId),
            challengedId: userId,
            status: 'PENDING'
        }
    });

    // Əgər təklif tapılmazsa, dərhal xəta verib funksiyanı dayandırırıq
    if (!challenge) {
        const error = new Error('Təklif tapılmadı və ya bu təklifə cavab vermək üçün icazəniz yoxdur.');
        error.statusCode = 404;
        throw error;
    }

    // 2. Yoxlama uğurlu olarsa, təklifi BİR DƏFƏ yeniləyirik
    const updatedChallenge = await prisma.challengeInstance.update({
        where: { id: Number(challengeId) },
        data: {
            status: response // "ACCEPTED" və ya "DECLINED"
        },
        include: {
            challenged: { include: { profile: { select: { name: true } } } }
        }
    });

    // 3. Yeniləmə uğurlu olarsa, bildiriş göndəririk
    if (updatedChallenge) {
        const message = response === 'ACCEPTED'
            ? `${updatedChallenge.challenged.profile.name} təklifinizi qəbul etdi! ✅`
            : `${updatedChallenge.challenged.profile.name} təklifinizi rədd etdi. ❌`;
        
        await createAndSendNotification(
            updatedChallenge.challengerId,
            'CHALLENGE_RESPONSE',
            message,
            { challengeId: updatedChallenge.id.toString() }
        );
    }
    
    // 4. Yenilənmiş təklifi geri qaytarırıq
    return updatedChallenge;
};

// İstifadəçinin bütün təkliflərini (göndərdiyi və aldığı) gətirir
const getMyChallenges = (userId) => {
    return prisma.challengeInstance.findMany({
        where: {
            OR: [
                { challengerId: userId },
                { challengedId: userId }
            ],
            // Yalnız aktiv olanları göstəririk (məsələn, rədd edilməmiş və vaxtı keçməmiş)
            status: { in: ['PENDING', 'ACCEPTED', 'COMPLETED'] }
        },
        include: {
            template: true,
            venue: { select: { name: true, address: true } },
            challenger: { include: { profile: { select: { name: true } } } },
            challenged: { include: { profile: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' }
    });
};

const verifyCheckInForChallenge = async (userId, venueId) => {
    try {
        const now = new Date();
        // İstifadəçinin qəbul edilmiş, tamamlanmamış və vaxtı uyğun gələn təkliflərini tapırıq
        const potentialChallenges = await prisma.challengeInstance.findMany({
            where: {
                status: 'ACCEPTED',
                venueId: Number(venueId),
                OR: [{ challengerId: userId }, { challengedId: userId }],
                challengeTime: {
                    gte: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Təklif vaxtından 2 saat əvvəl
                    lte: new Date(now.getTime() + 2 * 60 * 60 * 1000), // Təklif vaxtından 2 saat sonra
                }
            }
        });

        for (const challenge of potentialChallenges) {
            const isChallenger = challenge.challengerId === userId;
            let dataToUpdate = {};
            if (isChallenger) {
                dataToUpdate.challengerCheckedIn = true;
            } else {
                dataToUpdate.challengedCheckedIn = true;
            }

            const updatedChallenge = await prisma.challengeInstance.update({
                where: { id: challenge.id },
                data: dataToUpdate,
            });

            // Əgər hər iki tərəf check-in edibsə, təklifi tamamla və nişan ver!
            if (updatedChallenge.challengerCheckedIn && updatedChallenge.challengedCheckedIn) {
                await prisma.challengeInstance.update({
                    where: { id: challenge.id },
                    data: { status: 'COMPLETED' }
                });

                // Hər iki istifadəçiyə də nişanı veririk
                await gamificationService.grantBadge(challenge.challengerId, 'MEETUP_MASTER_1');
                await gamificationService.grantBadge(challenge.challengedId, 'MEETUP_MASTER_1');

                // TODO: Hər iki istifadəçiyə də təbriklər bildirişi göndər
            }
        }
    } catch (error) {
        console.error("Challenge check-in yoxlaması zamanı xəta:", error);
    }
};

module.exports = {
    getActiveTemplates,
    createChallenge,
    respondToChallenge,
    getMyChallenges,
    verifyCheckInForChallenge
};