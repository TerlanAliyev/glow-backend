
const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { registerDeviceController,getMyNotificationsController, markNotificationAsReadController } = require('./notification.controller'); // Controller-dən import edirik

const router = express.Router();

router.post(
    '/register-device',
    authenticateToken,
    [ body('token').notEmpty().withMessage('Cihaz tokeni boş ola bilməz') ],
    registerDeviceController
);
router.get('/', authenticateToken, getMyNotificationsController);
router.patch('/:id/read', authenticateToken, markNotificationAsReadController);

module.exports = router;