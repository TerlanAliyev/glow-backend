
const adminService = require('./admin.service');
const { validationResult } = require('express-validator');

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
//Stats
const getStatsSummary = asyncHandler(async (req, res) => {
    const stats = await adminService.getStatsSummary();
    res.status(200).json(stats);
});
const getUsageOverTime = asyncHandler(async (req, res) => {
    const data = await adminService.getUsageOverTime();
    res.status(200).json(data);
});

const getPopularVenues = asyncHandler(async (req, res) => {
    const data = await adminService.getPopularVenues();
    res.status(200).json(data);
});

//User Analytics & Search
const getUsers = asyncHandler(async (req, res) => {
    const queryParams = req.query;
    const users = await adminService.getUsers(queryParams);
    res.status(200).json(users);
});
const getRoles = asyncHandler(async (req, res) => {
    const roles = await adminService.getRoles();
    res.status(200).json(roles);
});
const updateUserRole = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { roleId } = req.body;
    const updatedUser = await adminService.updateUserRole(id, roleId);
    res.status(200).json(updatedUser);
});
const updateUserContact = asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
        await adminService.updateUserContact(id, req.body);
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
    const updatedUser = await adminService.updateUserStatus(id, isActive);
    res.status(200).json(updatedUser);
});
// src/admin/admin.controller.js

const getUserConnections = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query; // Query-dən parametrləri alırıq

    const connections = await adminService.getUserConnections(id, {
        page: parseInt(page),
        limit: parseInt(limit)
    });
    res.status(200).json(connections);
});

const getUserReports = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query; // Query-dən parametrləri alırıq

    const reports = await adminService.getUserReports(id, {
        page: parseInt(page),
        limit: parseInt(limit)
    });
    res.status(200).json(reports);
});

const getUserActivity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const activity = await adminService.getUserActivity(id);
    res.status(200).json(activity);
});
const getBannedUsers = asyncHandler(async (req, res) => {
    const users = await adminService.getBannedUsers(req.query);
    res.status(200).json(users);
});

const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await adminService.deleteUser(id, req.user.userId);
    res.status(204).send();
});


//Reports
const getReports = asyncHandler(async (req, res) => {
    const reports = await adminService.getReports();
    res.status(200).json(reports);
});

const updateReportStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const updatedReport = await adminService.updateReportStatus(parseInt(id), status);
    res.status(200).json(updatedReport);
});


// Venues
const getVenues = asyncHandler(async (req, res) => {
    const venues = await adminService.getVenues(req.query);
    res.status(200).json(venues);
});

const createVenue = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const newVenue = await adminService.createVenue(req.body);
    res.status(201).json(newVenue);
});

const updateVenue = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Yenilənəcək datanı birbaşa req.body-dən servisə ötürürük.
    // Xüsusi yoxlamalar və ya data çevrilmələri servis qatında edilməlidir.
    const updatedVenue = await adminService.updateVenue(parseInt(id), req.body);
    
    res.status(200).json(updatedVenue);
});


const deleteVenue = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await adminService.deleteVenue(parseInt(id));
    res.status(204).send(); // No Content
});
const getVenueActivity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const activity = await adminService.getVenueActivity(parseInt(id));
    res.status(200).json(activity);
});

const updateVenueStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const updatedVenue = await adminService.updateVenueStatus(parseInt(id), isActive);
    res.status(200).json(updatedVenue);
});

const updateVenueFeatureStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isFeatured } = req.body;
    const updatedVenue = await adminService.updateVenueFeatureStatus(parseInt(id), isFeatured);
    res.status(200).json(updatedVenue);
});

// Interests
const getCategories = asyncHandler(async (req, res) => {
    const categories = await adminService.getCategories();
    res.status(200).json(categories);
});

const createCategory = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const newCategory = await adminService.createCategory(req.body.name);
    res.status(201).json(newCategory);
});

const updateCategory = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const { id } = req.params;
    const { name } = req.body;
    const updatedCategory = await adminService.updateCategory(parseInt(id), name);
    res.status(200).json(updatedCategory);
});

const deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await adminService.deleteCategory(parseInt(id));
    res.status(204).send(); // No Content
});

const createInterest = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const newInterest = await adminService.createInterest(req.body);
    res.status(201).json(newInterest);
});

const deleteInterest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await adminService.deleteInterest(parseInt(id));
    res.status(204).send(); // No Content
});


//Admin Logs
const getAdminLogs = asyncHandler(async (req, res) => {
    const logs = await adminService.getAdminLogs(req.query);
    res.status(200).json(logs);
});


//Message Management
const deleteMessage = asyncHandler(async (req, res) => {
    const messageId = parseInt(req.params.id);
    await adminService.deleteMessage(messageId);
    res.status(204).send();
});

//Notification & Marketing
const broadcastNotification = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const adminId = req.user.userId;
    const { title, body } = req.body;
    const result = await adminService.broadcastNotification(adminId, title, body);
    res.status(200).json({ message: 'Bildiriş göndərmə prosesi başlandı.', result });
});

const getBroadcastHistory = asyncHandler(async (req, res) => {
    const history = await adminService.getBroadcastHistory();
    res.status(200).json(history);
});



// Icebreaker Questions
const getIcebreakers = asyncHandler(async (req, res) => {
    const questions = await adminService.getIcebreakers();
    res.status(200).json(questions);
});

const createIcebreaker = asyncHandler(async (req, res) => {
    // req.body-dən həm 'text', həm də 'category'-ni alırıq
    const newQuestion = await adminService.createIcebreaker(req.body);
    res.status(201).json(newQuestion);
});
const updateIcebreaker = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updatedQuestion = await adminService.updateIcebreaker(id, req.body);
    res.status(200).json(updatedQuestion);
});

const deleteIcebreaker = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await adminService.deleteIcebreaker(id);
    res.status(204).send();
});

const updateUserSubscription = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { subscription } = req.body;
    const updatedUser = await adminService.updateUserSubscription(id, subscription);
    res.status(200).json(updatedUser);
});

const triggerVenueStatCalculation = asyncHandler(async (req, res) => {
    const result = await adminService.triggerVenueStatCalculation();
    res.status(202).json(result); // 202 Accepted - prosesin başladığını bildirir
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
    updateUserSubscription,updateUserContact,triggerVenueStatCalculation
};