
const express = require('express');
const {
    getUsers,
    updateUserRole,
    updateUserStatus,
    getReports,
    updateReportStatus,
    getVenues,
    createVenue,
    updateVenue,
    deleteVenue,
    getCategories,
    createCategory,
    createInterest,
    deleteInterest,
    getAdminLogs,
    getUserConnections,
    getUserReports,
    getUserActivity,
    deleteMessage, getVenueActivity,
    updateVenueStatus,
    updateVenueFeatureStatus,
    broadcastNotification,
    getBroadcastHistory,getStatsSummary,
    getUsageOverTime,
    getPopularVenues,getRoles,updateCategory,
    deleteCategory,getBannedUsers,
    deleteUser,
    getIcebreakers,
    createIcebreaker,
    updateIcebreaker,
    deleteIcebreaker,
    updateUserSubscription,updateUserContact,triggerVenueStatCalculation,
    getVerificationRequests, 
    updateVerificationStatus,
    getBadges, createBadge, updateBadge, deleteBadge,
    getBadgeRules, createBadgeRule,getChallengeTemplates, createChallengeTemplate, updateChallengeTemplate, deleteChallengeTemplate
    
    

} = require('./admin.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
const { body } = require('express-validator');
const upload = require('../upload/upload.service'); // <-- YENİ İMPORT

const router = express.Router();
const adminOnly = [authenticateToken, isAdmin]; // Qısa yol

// Dashboard
router.get('/stats/summary', adminOnly, getStatsSummary);
router.get('/stats/usage-over-time', adminOnly, getUsageOverTime);
router.get('/stats/popular-venues', adminOnly, getPopularVenues);

// User Management
router.get('/users', adminOnly, getUsers);
router.patch('/users/:id/role', adminOnly, updateUserRole);
router.patch('/users/:id/status', adminOnly, updateUserStatus);
router.get('/roles', adminOnly, getRoles);
router.get('/users/banned', adminOnly, getBannedUsers);
router.delete('/users/:id', adminOnly, deleteUser);
router.patch('/users/:id/contact', adminOnly, updateUserContact);
//User Analytics & Search
router.get('/users/:id/connections', adminOnly, getUserConnections);
router.get('/users/:id/reports', adminOnly, getUserReports);
router.get('/users/:id/activity', adminOnly, getUserActivity);


// Moderation
router.get('/reports', adminOnly, getReports);
router.patch('/reports/:id/status', adminOnly, updateReportStatus);
router.get('/venues', adminOnly, getVenues);
router.post('/venues', adminOnly, [
    body('name').notEmpty(),
    body('latitude').isFloat(),
    body('longitude').isFloat(),
    body('category').optional().isIn(['GENERAL', 'CAFE', 'RESTAURANT', 'UNIVERSITY', 'BAR', 'EVENT_SPACE'])
], createVenue);
router.patch('/venues/:id', adminOnly, updateVenue);
router.delete('/venues/:id', adminOnly, deleteVenue);
router.get('/venues/:id/activity', adminOnly, getVenueActivity);
router.patch('/venues/:id/status', adminOnly, updateVenueStatus);
router.patch('/venues/:id/feature', adminOnly, updateVenueFeatureStatus);

// === YENİ ƏLAVƏ: Interest Management ===
router.get('/categories', adminOnly, getCategories);
router.post('/categories', adminOnly, [body('name').notEmpty()], createCategory);
router.patch('/categories/:id', adminOnly, [body('name').notEmpty()], updateCategory); // YENİ
router.delete('/categories/:id', adminOnly, deleteCategory); // YENİ
router.post('/interests', adminOnly, [body('name').notEmpty(), body('categoryId').isInt()], createInterest);
router.delete('/interests/:id', adminOnly, deleteInterest);

// Admin Logs
router.get('/logs', adminOnly, getAdminLogs);

// === YENİ ƏLAVƏ: Message Moderation ===
router.delete('/messages/:id', adminOnly, deleteMessage);


//Notification & Marketing
router.post('/notifications/broadcast', adminOnly, [
    body('title').notEmpty(),
    body('body').notEmpty(),
], broadcastNotification);
router.get('/notifications/history', adminOnly, getBroadcastHistory);


//Icebreaker Management ===
router.get('/icebreakers', adminOnly, getIcebreakers);
router.post('/icebreakers', adminOnly, [
    body('text').notEmpty(),
    body('category').optional().isIn(['GENERAL', 'FOOD_DRINK', 'STUDENT_LIFE', 'NIGHTLIFE', 'DEEP_TALK'])
], createIcebreaker);router.patch('/icebreakers/:id', adminOnly, updateIcebreaker);
router.delete('/icebreakers/:id', adminOnly, deleteIcebreaker);


//Preium-Free
router.patch('/users/:id/subscription', adminOnly, updateUserSubscription);

router.post('/stats/calculate-venue-stats', adminOnly, triggerVenueStatCalculation);

// User Verification
router.get('/verifications', adminOnly, getVerificationRequests);
router.patch('/verifications/:profileId/status', adminOnly, updateVerificationStatus);

// === GAMIFICATION (BADGE) MANAGEMENT ===
router.get('/badges', adminOnly, getBadges);
router.post('/badges', adminOnly, upload.single('icon'), createBadge);
router.patch('/badges/:id', adminOnly, upload.single('icon'), updateBadge);
router.delete('/badges/:id', adminOnly, deleteBadge);


// === GAMIFICATION (BADGE) MANAGEMENT ===
router.get('/badges/rules', adminOnly, getBadgeRules);
router.post('/badges/rules', adminOnly, createBadgeRule);
router.get('/badges', adminOnly, getBadges);

// === CHALLENGE TEMPLATE MANAGEMENT ===
router.get('/challenge-templates', adminOnly, getChallengeTemplates);
router.post('/challenge-templates', adminOnly, createChallengeTemplate);
router.patch('/challenge-templates/:id', adminOnly, updateChallengeTemplate);
router.delete('/challenge-templates/:id', adminOnly, deleteChallengeTemplate);


module.exports = router;