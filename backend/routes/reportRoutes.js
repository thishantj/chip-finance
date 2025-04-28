const express = require('express');
const reportController = require('../controllers/reportController');
const isAuthenticated = require('../middleware/authMiddleware');

const router = express.Router();

router.use(isAuthenticated); // Apply authentication middleware to all report routes

// --- Client Summary PDF Report Routes ---
// GET /api/reports/client-summary/:clientId/preview
router.get('/client-summary/:clientId/preview', reportController.generateClientSummaryReport);
// GET /api/reports/client-summary/:clientId/download
router.get('/client-summary/:clientId/download', reportController.generateClientSummaryReport);

// --- Net Profit PDF Report Routes ---
// GET /api/reports/net-profit/preview
router.get('/net-profit/preview', reportController.generateNetProfitReport);
// GET /api/reports/net-profit/download
router.get('/net-profit/download', reportController.generateNetProfitReport);

module.exports = router;
