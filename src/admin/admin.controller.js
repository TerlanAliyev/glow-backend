
const { validationResult } = require('express-validator');
const statsService = require('./services/stats.service');
const userManagementService = require('./services/user.management.service');
const contentService = require('./services/content.service');
const moderationService = require('./services/moderation.service');
const marketingService = require('./services/marketing.service');
const auditService = require('./services/audit.service');
const icebreakerService = require('./services/icebreakers.service'); 
const gamificationService = require('../gamification/gamification.service');

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
// === Stats Controllers ===
const getStatsSummary = asyncHandler(async (req, res) => {
    const stats = await statsService.getStatsSummary();
    res.status(200).json(stats);
});
const getUsageOverTime = asyncHandler(async (req, res) => {
    const data = await statsService.getUsageOverTime();
    res.status(200).json(data);
});

const getPopularVenues = asyncHandler(async (req, res) => {
    const data = await statsService.getPopularVenues();
    res.status(200).json(data);
});

//User Analytics & Search
const getUsers = asyncHandler(async (req, res) => {
    const queryParams = req.query;
    const users = await userManagementService.getUsers(queryParams);
    res.status(200).json(users);
});
const getRoles = asyncHandler(async (req, res) => {
    const roles = await userManagementService.getRoles();
    res.status(200).json(roles);
});

const updateUserRole = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { roleId } = req.body;
    const adminId = req.user.userId; // Adminin öz ID-sini token-dən götürürük
    
    // Servisə 3 parametr göndəririk
    const updatedUser = await userManagementService.updateUserRole(id, roleId, adminId);

    res.status(200).json(updatedUser);
});
const updateUserContact = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.userId; // Adminin öz ID-sini token-dən götürürük

    try {
        // DÜZƏLİŞ: "adminId"-ni də servis funksiyasına üçüncü parametr olaraq göndəririk
        await userManagementService.updateUserContact(id, req.body, adminId);
        
        res.status(200).json({ message: 'İstifadəçinin əlaqə məlumatları uğurla yeniləndi.' });
    } catch (error) {
        // Əgər yeni email və ya nömrə artıq başqası tərəfindən istifadə edilirsə...
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'Bu e-poçt və ya telefon nömrəsi artıq istifadə olunur.' });
        }
        throw error; // Digər xətaları ümumi idarəediciyə ötür
    }
});
const updateUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const adminId = req.user.userId; // Adminin öz ID-sini token-dən götürürük
    
    const updatedUser = await userManagementService.updateUserStatus(id, isActive, adminId);
    res.status(200).json(updatedUser);
});
// src/admin/admin.controller.js

const getUserConnections = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query; // Query-dən parametrləri alırıq

    const connections = await userManagementService.getUserConnections(id, {
        page: parseInt(page),
        limit: parseInt(limit)
    });
    res.status(200).json(connections);
});

const getUserReports = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query; // Query-dən parametrləri alırıq

    const reports = await userManagementService.getUserReports(id, {
        page: parseInt(page),
        limit: parseInt(limit)
    });
    res.status(200).json(reports);
});

const getUserActivity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const activity = await userManagementService.getUserActivity(id);
    res.status(200).json(activity);
});
const getBannedUsers = asyncHandler(async (req, res) => {
    const users = await userManagementService.getBannedUsers(req.query);
    res.status(200).json(users);
});

const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await userManagementService.deleteUser(id, req.user.userId);
    res.status(204).send();
});


//Reports
const getReports = asyncHandler(async (req, res) => {
    // DÜZƏLİŞ: req.query parametrlərini servisə ötürürük
    const reports = await moderationService.getReports(req.query); 
    res.status(200).json(reports);
});

const updateReportStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const updatedReport = await moderationService.updateReportStatus(parseInt(id), status);
    res.status(200).json(updatedReport);
});


// Venues
const getVenues = asyncHandler(async (req, res) => {
    const venues = await contentService.getVenues(req.query);
    res.status(200).json(venues);
});

const createVenue = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const newVenue = await contentService.createVenue(req.body);
    res.status(201).json(newVenue);
});

const updateVenue = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Yenilənəcək datanı birbaşa req.body-dən servisə ötürürük.
    // Xüsusi yoxlamalar və ya data çevrilmələri servis qatında edilməlidir.
    const updatedVenue = await contentService.updateVenue(parseInt(id), req.body);
    
    res.status(200).json(updatedVenue);
});


const deleteVenue = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await contentService.deleteVenue(parseInt(id));
    res.status(204).send(); // No Content
});
const getVenueActivity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const activity = await contentService.getVenueActivity(parseInt(id));
    res.status(200).json(activity);
});

const updateVenueStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const updatedVenue = await contentService.updateVenueStatus(parseInt(id), isActive);
    res.status(200).json(updatedVenue);
});

const updateVenueFeatureStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isFeatured } = req.body;
    const updatedVenue = await contentService.updateVenueFeatureStatus(parseInt(id), isFeatured);
    res.status(200).json(updatedVenue);
});

// Interests
const getCategories = asyncHandler(async (req, res) => {
    const categories = await contentService.getCategories();
    res.status(200).json(categories);
});

const createCategory = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const newCategory = await contentService.createCategory(req.body.name);
    res.status(201).json(newCategory);
});

const updateCategory = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const { id } = req.params;
    const { name } = req.body;
    const updatedCategory = await contentService.updateCategory(parseInt(id), name);
    res.status(200).json(updatedCategory);
});

const deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await contentService.deleteCategory(parseInt(id));
    res.status(204).send(); // No Content
});

const createInterest = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const newInterest = await contentService.createInterest(req.body);
    res.status(201).json(newInterest);
});

const deleteInterest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await contentService.deleteInterest(parseInt(id));
    res.status(204).send(); // No Content
});


//Admin Logs
const getAdminLogs = asyncHandler(async (req, res) => {
    const logs = await auditService.getAdminLogs(req.query);
    res.status(200).json(logs);
});


//Message Management
const deleteMessage = asyncHandler(async (req, res) => {
    const messageId = parseInt(req.params.id);
    await moderationService.deleteMessage(messageId);
    res.status(204).send();
});

//Notification & Marketing
const broadcastNotification = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const adminId = req.user.userId;
    const { title, body } = req.body;
    const result = await marketingService.broadcastNotification(adminId, title, body);
    res.status(200).json({ message: 'Bildiriş göndərmə prosesi başlandı.', result });
});

const getBroadcastHistory = asyncHandler(async (req, res) => {
    const history = await marketingService.getBroadcastHistory();
    res.status(200).json(history);
});



// Icebreaker Questions
const getIcebreakers = asyncHandler(async (req, res) => {
    // DÜZƏLİŞ: Funksiyanı icebreakerService-dən çağırırıq
    const questions = await icebreakerService.getIcebreakers();
    res.status(200).json(questions);
});

const createIcebreaker = asyncHandler(async (req, res) => {
    // DÜZƏLİŞ: Funksiyanı icebreakerService-dən çağırırıq
    const newQuestion = await icebreakerService.createIcebreaker(req.body.text, req.body.category);
    res.status(201).json(newQuestion);
});

const updateIcebreaker = asyncHandler(async (req, res) => {
    const { id } = req.params;
    // DÜZƏLİŞ: Funksiyanı icebreakerService-dən çağırırıq
    const updatedQuestion = await icebreakerService.updateIcebreaker(id, req.body);
    res.status(200).json(updatedQuestion);
});

const deleteIcebreaker = asyncHandler(async (req, res) => {
    const { id } = req.params;
    // DÜZƏLİŞ: Funksiyanı icebreakerService-dən çağırırıq
    await icebreakerService.deleteIcebreaker(id);
    res.status(204).send();
});

const updateUserSubscription = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { subscription } = req.body;
    const updatedUser = await userManagementService.updateUserSubscription(id, subscription);
    res.status(200).json(updatedUser);
});

const triggerVenueStatCalculation = asyncHandler(async (req, res) => {
    const result = await statsService.triggerVenueStatCalculation();
    res.status(202).json(result); // 202 Accepted - prosesin başladığını bildirir
});


const getVerificationRequests = asyncHandler(async (req, res) => {
    const requests = await userManagementService.getVerificationRequests(req.query);
    res.status(200).json(requests);
});

const updateVerificationStatus = asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const { status } = req.body; // Body-dən yeni statusu alırıq

    if (!status) {
        return res.status(400).json({ message: 'Yeni status təqdim edilməlidir.' });
    }

    const adminId = req.user.userId;
    const result = await userManagementService.updateVerificationStatus(profileId, status.toUpperCase(), adminId);
    res.status(200).json(result);
});

// === GAMIFICATION (BADGE) MANAGEMENT ===
const getBadges = asyncHandler(async (req, res) => {
    const badges = await gamificationService.getAllBadges();
    res.status(200).json(badges);
});

const createBadge = asyncHandler(async (req, res) => {
    const newBadge = await gamificationService.createBadge(req.body);
    res.status(201).json(newBadge);
});

const updateBadge = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updatedBadge = await gamificationService.updateBadge(id, req.body);
    res.status(200).json(updatedBadge);
});

const deleteBadge = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await gamificationService.deleteBadge(id);
    res.status(204).send();
});

module.exports = {
     getUsers, updateUserRole, updateUserStatus, getReports, updateReportStatus,
    getVenues, createVenue, updateVenue, deleteVenue,
    getCategories, createCategory, createInterest, deleteInterest, getAdminLogs,
    getUserConnections, getUserReports, getUserActivity,deleteMessage,getVenueActivity,
    updateVenueStatus,
    updateVenueFeatureStatus, broadcastNotification,
    getBroadcastHistory,getStatsSummary,
    getUsageOverTime,
    getPopularVenues,getRoles, updateCategory,
    deleteCategory,getBannedUsers,
    deleteUser,
    getIcebreakers, createIcebreaker, updateIcebreaker, deleteIcebreaker,
    updateUserSubscription,updateUserContact,triggerVenueStatCalculation,
    getVerificationRequests, updateVerificationStatus,
    getBadges, createBadge, updateBadge, deleteBadge
};