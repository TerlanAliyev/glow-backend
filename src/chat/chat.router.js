
const express = require('express');
const { getChatHistory, reportMessage,reportGroupMessage, getIcebreakers, getVenueChatHistory, deleteMessage, uploadChatImage, uploadGroupChatImage, uploadAudioMessage } = require('./chat.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const upload = require('../upload/upload.service');


const router = express.Router();

router.get('/icebreakers', authenticateToken, getIcebreakers);
router.get('/:connectionId/messages', authenticateToken, getChatHistory);
router.post(
    '/messages/:id/report',
    authenticateToken,
    [body('reason').notEmpty().withMessage('Səbəb göstərilməlidir')],
    reportMessage
);
router.post(
    '/group-messages/:id/report',
    authenticateToken,
    [body('reason').notEmpty().withMessage('Səbəb göstərilməlidir')],
    reportGroupMessage
);
router.get('/venue/:venueId/messages', authenticateToken, getVenueChatHistory);
router.delete('/messages/:id', authenticateToken, deleteMessage);
router.post('/upload-image', authenticateToken, upload.single('chatImage'), uploadChatImage);
router.post('/group/upload-image', authenticateToken, upload.single('groupChatImage'), uploadGroupChatImage);
router.post('/upload-audio', authenticateToken, upload.single('chatAudio'), uploadAudioMessage);


module.exports = router;
