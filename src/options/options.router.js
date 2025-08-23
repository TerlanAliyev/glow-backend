const express = require('express');
const { getOptions } = require('./options.controller');

const router = express.Router();

// Bu endpoint autentifikasiya tələb etmir ki, qeydiyyat səhifəsində də istifadə olunsun
router.get('/options', getOptions);

module.exports = router;