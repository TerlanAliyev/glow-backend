const { Prisma } = require('@prisma/client'); // <-- BU SƏTRİ FAYLIN YUXARISINA ƏLAVƏ EDİN

const prisma = require('../config/prisma');
const gamificationService = require('../gamification/gamification.service');
const { createAuditLog } = require('../admin/services/audit.service');
const challengeService = require('../challenge/challenge.service'); // <-- YENİ İMPORT


// Haversine formulası ilə məsafəni hesablamaq üçün funksiya
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Yer kürəsinin radiusu (metrlə)
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Nəticə metrlə
};
const MAX_DISTANCE_METERS = 200; // Maksimum icazə verilən məsafə (metrlə)


const checkInUser = async (userId, latitude, longitude) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isActive: true }
    });
    if (!user || !user.isActive) {
        const error = new Error('Hesabınız deaktiv edilib. Məkana daxil ola bilməzsiniz.');
        error.statusCode = 403; // Forbidden
        throw error;
    }

    const userPoint = `point(${longitude}, ${latitude})`;

    const nearbyVenues = await prisma.$queryRaw`
        SELECT id, name, address, latitude, longitude
        FROM \`Venue\`
        WHERE ST_Distance_Sphere(
            point(longitude, latitude),
            ${Prisma.raw(userPoint)} 
        ) <= 200 
        ORDER BY ST_Distance_Sphere(
            point(longitude, latitude),
            ${Prisma.raw(userPoint)}
        )
        LIMIT 5;
    `;


    if (nearbyVenues.length === 0) {
        const error = new Error('Yaxınlıqda heç bir məkan tapılmadı.');
        error.statusCode = 404;
        throw error;
    }


    if (nearbyVenues.length === 1) {
        const venue = nearbyVenues[0];
        const distance = getDistanceInMeters(latitude, longitude, venue.latitude, venue.longitude);
        if (distance > MAX_DISTANCE_METERS) {
            const error = new Error(`Avtomatik check-in uğursuz oldu. Məkandan çox uzaqdasınız (təxminən ${Math.round(distance)} metr).`);
            error.statusCode = 400;
            throw error;
        }

        // DƏYİŞİKLİK: Sizin kodunuzu interaktiv tranzaksiya ilə birləşdiririk
        const activeSession = await prisma.$transaction(async (tx) => {
            const session = await tx.activeSession.upsert({
                where: { userId: userId },
                update: { venueId: venue.id, expiresAt: new Date(new Date().getTime() + 2 * 60 * 60 * 1000) },
                create: { userId: userId, venueId: venue.id, expiresAt: new Date(new Date().getTime() + 2 * 60 * 60 * 1000) },
                include: { venue: true }
            });

            await tx.checkInHistory.create({
                data: { userId: userId, venueId: venue.id }
            });

            // Nişan yoxlamasını tranzaksiya daxilində çağırırıq
            await gamificationService.checkAndGrantBadges(userId, 'NEW_CHECKIN', tx);
           await  challengeService.verifyCheckInForChallenge(userId, venueId);

            return session; // Tranzaksiyadan nəticəni qaytarırıq
        });

        return { status: 'CHECKED_IN', session: activeSession };
    }

    return { status: 'MULTIPLE_OPTIONS', venues: nearbyVenues };
};


const finalizeCheckIn = async (userId, venueId, userLatitude, userLongitude) => {
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
        const error = new Error('Məkan tapılmadı.');
        error.statusCode = 404;
        throw error;
    }

    const distance = getDistanceInMeters(userLatitude, userLongitude, venue.latitude, venue.longitude);

    if (distance > MAX_DISTANCE_METERS) {
        const error = new Error(`Check-in uğursuz oldu. Məkandan çox uzaqdasınız (təxminən ${Math.round(distance)} metr).`);
        error.statusCode = 400;
        throw error;
    }

    const activeSession = await prisma.$transaction(async (tx) => {
        const session = await tx.activeSession.upsert({
            where: { userId: userId },
            update: {
                venueId: venueId,
                expiresAt: new Date(new Date().getTime() + 2 * 60 * 60 * 1000)
            },
            create: {
                userId: userId,
                venueId: venueId,
                expiresAt: new Date(new Date().getTime() + 2 * 60 * 60 * 1000)
            },
            include: { venue: true }
        });

        await tx.checkInHistory.create({
            data: { userId: userId, venueId: venueId }
        });

        // Nişan yoxlamasını tranzaksiya daxilində çağırırıq
        await gamificationService.checkAndGrantBadges(userId, 'NEW_CHECKIN', tx);

        return session; // Tranzaksiyadan nəticəni qaytarırıq
    });

    return activeSession;
};

// Test məqsədli funksiya

const setIncognitoStatus = async (userId, status) => {
    // 1. İstifadəçinin aktiv sessiyası olub-olmadığını yoxlayırıq (Bu hissə düzgündür)
    const activeSession = await prisma.activeSession.findUnique({
        where: { userId },
    });

    if (!activeSession) {
        const error = new Error('Görünməz rejimi aktiv etmək üçün əvvəlcə bir məkana check-in etməlisiniz.');
        error.statusCode = 400; // Bad Request
        throw error;
    }

    // 2. Əvvəlcə verilənlər bazasını yeniləyirik
    const updatedSession = await prisma.activeSession.update({
        where: { userId },
        data: { isIncognito: status },
    });

    // 3. Sonra uğurlu əməliyyatı qeydə alırıq (loglayırıq)
    await createAuditLog(
        userId,
        status ? 'USER_ACTIVATED_INCOGNITO' : 'USER_DEACTIVATED_INCOGNITO',
        // DƏYİŞİKLİK: Artıq mövcud olan 'activeSession'-dan istifadə edirik
        { venueId: activeSession.venueId }
    );

    // 4. Yenilənmiş sessiyanı geri qaytarırıq
    return updatedSession;
};


// statistics funksiyası
const getVenueStats = async (venueId) => {
    const venue = await prisma.venue.findUnique({
        where: { id: Number(venueId) },
        select: { statsSummary: true }
    });
    if (!venue) {
        const error = new Error('Məkan tapılmadı.');
        error.statusCode = 404;
        throw error;
    }
    return venue.statsSummary || {};
};

const getLiveVenueStats = async (venueId) => {
    const sessions = await prisma.activeSession.findMany({
        where: { venueId: Number(venueId) },
        include: {
            user: {
                include: {
                    profile: {
                        select: { gender: true, age: true }
                    }
                }
            }
        }
    });

    if (sessions.length === 0) {
        return { userCount: 0, genderRatio: {}, ageRange: 'N/A' };
    }

    let maleCount = 0;
    let femaleCount = 0;
    const ages = [];

    sessions.forEach(session => {
        if (session.user.profile) {
            if (session.user.profile.gender === 'MALE') maleCount++;
            if (session.user.profile.gender === 'FEMALE') femaleCount++;
            if (session.user.profile.age) ages.push(session.user.profile.age);
        }
    });

    const totalGenderedUsers = maleCount + femaleCount;
    const genderRatio = {
        male: totalGenderedUsers > 0 ? Math.round((maleCount / totalGenderedUsers) * 100) : 0,
        female: totalGenderedUsers > 0 ? Math.round((femaleCount / totalGenderedUsers) * 100) : 0,
    };

    let ageRange = 'N/A';
    if (ages.length > 0) {
        const minAge = Math.min(...ages);
        const maxAge = Math.max(...ages);
        ageRange = `${minAge}-${maxAge}`;
    }

    return {
        userCount: sessions.length,
        genderRatio,
        ageRange
    };
};

module.exports = {
    checkInUser,
    setIncognitoStatus,
    finalizeCheckIn, getVenueStats, getLiveVenueStats, getDistanceInMeters
};