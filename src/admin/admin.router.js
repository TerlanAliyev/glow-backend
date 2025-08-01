
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
    deleteUser

} = require('./admin.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
const { body } = require('express-validator');

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














module.exports = router;