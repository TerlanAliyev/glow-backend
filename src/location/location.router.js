
const express = require('express');
const { checkIn, seedVenues,setIncognito,finalizeCheckIn,getVenueStats,getLiveVenueStats  } = require('./location.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { isPremium } = require('../middleware/premium.middleware');

const router = express.Router();

// POST /api/location/check-in - İstifadəçinin məkana daxil olması
router.post(
  '/check-in',
  authenticateToken,
  [
    body('latitude').isFloat().withMessage('Enlik (latitude) düzgün deyil'),
    body('longitude').isFloat().withMessage('Uzunluq (longitude) düzgün deyil'),
  ],
  checkIn
);

// POST /api/location/seed - Test üçün databazaya məkanları əlavə edir
router.post('/seed', seedVenues);
router.patch('/incognito', authenticateToken, setIncognito);
router.post('/check-in/finalize', authenticateToken, finalizeCheckIn);
router.get('/venues/:id/stats', authenticateToken, getVenueStats);
router.get('/venues/:id/live-stats', authenticateToken, isPremium, getLiveVenueStats);

module.exports = router;