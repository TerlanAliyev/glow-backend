
const express = require('express');
const { getAllInterests } = require('./interest.controller');

const router = express.Router();

// GET /api/interest - Bütün maraqları gətirir
router.get('/', getAllInterests);


module.exports = router;
