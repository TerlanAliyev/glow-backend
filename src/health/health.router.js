
const express = require('express');
const { checkHealth } = require('./health.controller');
const prisma = require('../config/prisma'); // Prisma-nı import edirik


const router = express.Router();

router.get('/', checkHealth);

module.exports = router;
