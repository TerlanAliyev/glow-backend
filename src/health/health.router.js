
const express = require('express');
const { checkHealth } = require('./health.controller');
const prisma = require('../config/prisma'); // Prisma-nı import edirik


const router = express.Router();

router.get('/', checkHealth);
router.get('/test-venue', async (req, res) => {
    try {
        const venue9 = await prisma.venue.findUnique({ where: { id: 9 } });
        const allVenues = await prisma.venue.findMany(); // Bütün məkanları da çəkək

        res.json({
            message: "Test sorğusunun nəticəsi",
            venueWithId9: venue9 || "TAPILMADI",
            totalVenuesInDB: allVenues.length,
            allVenues: allVenues
        });
    } catch (error) {
        res.status(500).json({ status: 'XƏTA', message: error.message });
    }
});
module.exports = router;
