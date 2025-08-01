
const prisma = require('../config/prisma');

const checkInUser = async (userId, latitude, longitude) => {
  // 1. Verilən koordinatlara ən yaxın məkanı tapırıq
  const venues = await prisma.$queryRaw`
    SELECT id, name
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
    LIMIT 1;
  `;

  if (venues.length === 0) {
    throw new Error('Yaxınlıqda heç bir məkan tapılmadı.');
  }

  const nearestVenue = venues[0];

  // 2. Həm aktiv sessiyanı yaradırıq/yeniləyirik, həm də tarixçəyə yeni bir qeyd əlavə edirik.
  // Bütün bu əməliyyatları tək bir "transaction"-da edirik ki, data bütövlüyü qorunsun.
  const [activeSession, _] = await prisma.$transaction([
    // a) Aktiv sessiyanı yarat/yenilə
    prisma.activeSession.upsert({
        where: { userId: userId },
        update: { 
            venueId: nearestVenue.id, 
            expiresAt: new Date(new Date().getTime() + 2 * 60 * 60 * 1000) // 2 saat sonra
        },
        create: { 
            userId: userId, 
            venueId: nearestVenue.id, 
            expiresAt: new Date(new Date().getTime() + 2 * 60 * 60 * 1000) // 2 saat sonra
        },
        include: { venue: true }
    }),
    // b) Tarixçəyə yeni bir qeyd əlavə et
    prisma.checkInHistory.create({
        data: {
            userId: userId,
            venueId: nearestVenue.id,
        }
    })
  ]);

  return activeSession;
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

module.exports = {
  checkInUser,
  seedDatabaseWithVenues,
};