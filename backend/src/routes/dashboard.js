const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Dashboard routes
router.get('/stats', dashboardController.getDashboardStats);
router.get('/recent-messages', dashboardController.getRecentMessages);
router.get('/recent-contacts', dashboardController.getRecentContacts);

module.exports = router;