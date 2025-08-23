
const { validationResult } = require('express-validator');
const locationService = require('./location.service');
const { isPremium } = require('../middleware/premium.middleware'); // Bunu faylın yuxarısına əlavə edin
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
const checkIn = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const userId = req.user.userId;
    const { latitude, longitude } = req.body;

  const result = await locationService.checkInUser(userId, latitude, longitude);
      
    if (result.status === 'CHECKED_IN') {
        return res.status(200).json({ 
            status: 'CHECKED_IN',
            message: `Siz uğurla '${result.session.venue.name}'-a daxil oldunuz!`, 
            data: result.session 
        });
    }
  
    if (result.status === 'MULTIPLE_OPTIONS') {
        return res.status(200).json({
            status: 'MULTIPLE_OPTIONS',
            message: 'Yaxınlığınızda bir neçə məkan tapıldı.',
            data: result.venues
        });
    }
});


const setIncognito = asyncHandler(async (req, res) => {
    const { status } = req.body; // status: true və ya false
    if (typeof status !== 'boolean') {
        return res.status(400).json({ message: 'Status sahəsi boolean (true/false) olmalıdır.' });
    }
    await locationService.setIncognitoStatus(req.user.userId, status);
    res.status(200).json({ message: `Görünməz rejim uğurla ${status ? 'aktiv' : 'deaktiv'} edildi.` });
});
const finalizeCheckIn = asyncHandler(async (req, res) => {
    const { venueId, latitude, longitude } = req.body;
    
    // Validasiya yoxlamaları router səviyyəsində ediləcək
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const session = await locationService.finalizeCheckIn(
        req.user.userId,
        Number(venueId),
        latitude,
        longitude
    );

    res.status(200).json({
        status: 'CHECKED_IN',
        message: `Siz uğurla '${session.venue.name}'-a daxil oldunuz!`,
        data: session
    });
});
const getVenueStats = asyncHandler(async (req, res) => {
    const stats = await locationService.getVenueStats(req.params.id);
    res.status(200).json(stats);
});
const getLiveVenueStats = asyncHandler(async (req, res) => {
    const stats = await locationService.getLiveVenueStats(req.params.id);
    res.status(200).json(stats);
});
module.exports = {
  checkIn,
  setIncognito,
  finalizeCheckIn,getVenueStats,getLiveVenueStats
};
