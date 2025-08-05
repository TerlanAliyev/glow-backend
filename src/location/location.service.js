
const prisma = require('../config/prisma');

// src/location/location.service.js faylındakı checkInUser funksiyasını bununla əvəz edin

const checkInUser = async (userId, latitude, longitude) => {
    const nearbyVenues = await prisma.$queryRaw`
        SELECT id, name, address
        FROM "Venue"
        WHERE ST_DWithin(
            ST_MakePoint(longitude, latitude)::geography,
            ST_MakePoint(${longitude}, ${latitude})::geography,
            100
        )
        ORDER BY ST_Distance(
            ST_MakePoint(longitude, latitude),
            ST_MakePoint(${longitude}, ${latitude})
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
        const [activeSession, _] = await prisma.$transaction([
            prisma.activeSession.upsert({
                where: { userId: userId },
                update: { venueId: venue.id, expiresAt: new Date(new Date().getTime() + 2 * 60 * 60 * 1000) },
                create: { userId: userId, venueId: venue.id, expiresAt: new Date(new Date().getTime() + 2 * 60 * 60 * 1000) },
                include: { venue: true }
            }),
            prisma.checkInHistory.create({
                data: { userId: userId, venueId: venue.id }
            })
        ]);
        return { status: 'CHECKED_IN', session: activeSession };
    }

    return { status: 'MULTIPLE_OPTIONS', venues: nearbyVenues };
};

// Test məqsədli funksiya
const seedDatabaseWithVenues = async () => {
    await prisma.venue.deleteMany({});
    await prisma.venue.createMany({
        data: [
            { name: 'Second Cup', address: 'Fountains Square', latitude: 40.3777, longitude: 49.8344 },
            { name: 'Coffee Moffie', address: 'Khagani Street', latitude: 40.3789, longitude: 49.8398 },
            { name: 'Emalatxana', address: 'Istiqlaliyyat Street', latitude: 40.3665, longitude: 49.8324 },
        ]
    });
};
const setIncognitoStatus = async (userId, status) => {
    // İstifadəçinin aktiv sessiyası olmalıdır
    const activeSession = await prisma.activeSession.findUnique({
        where: { userId },
    });

    if (!activeSession) {
        const error = new Error('Görünməz rejimi aktiv etmək üçün əvvəlcə bir məkana check-in etməlisiniz.');
        error.statusCode = 400; // Bad Request
        throw error;
    }

    return prisma.activeSession.update({
        where: { userId },
        data: { isIncognito: status },
    });
};
const finalizeCheckIn = async (userId, venueId) => {
    // Bu funksiya sadəcə verilən məkan ID-si ilə ActiveSession yaradır/yeniləyir
    const [activeSession, _] = await prisma.$transaction([
        prisma.activeSession.upsert({
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
        }), prisma.checkInHistory.create({
            data: { userId: userId, venueId: venueId }
        })]);

    return activeSession;
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
    seedDatabaseWithVenues,
    setIncognitoStatus,
    finalizeCheckIn, getVenueStats, getLiveVenueStats
};