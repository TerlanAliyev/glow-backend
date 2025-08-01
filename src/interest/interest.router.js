
const express = require('express');
const { getAllInterests, seedInterests } = require('./interest.controller');

const router = express.Router();

// GET /api/interest - Bütün maraqları gətirir
router.get('/', getAllInterests);

// POST /api/interest/seed - Test üçün databazaya maraqları əlavə edir
router.post('/seed', seedInterests);

module.exports = router;
