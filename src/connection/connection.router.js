
const express = require('express');
const { unmatchUser, getMyConnections } = require('./connection.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/connections - Hazırkı istifadəçinin bütün bağlantılarını gətirir
router.get('/', authenticateToken, getMyConnections);

// DELETE /api/connections/:id - Bir bağlantını (match) silir
router.delete('/:id', authenticateToken, unmatchUser);

module.exports = router;