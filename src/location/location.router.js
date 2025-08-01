
const express = require('express');
const { checkIn, seedVenues } = require('./location.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { body } = require('express-validator');

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

module.exports = router;