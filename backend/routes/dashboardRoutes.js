const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const isAuthenticated = require('../middleware/authMiddleware'); // Assuming this middleware checks authentication

const router = express.Router();

// Apply authentication middleware to all dashboard routes
router.use(isAuthenticated);

// Define summary routes
router.get('/summary/weekly-payments', dashboardController.getWeeklyPaymentsSummary);
router.get('/summary/monthly-payments', dashboardController.getMonthlyPaymentsSummary);
router.get('/summary/monthly-loans-count', dashboardController.getMonthlyLoansCountSummary);
router.get('/summary/monthly-new-clients', dashboardController.getMonthlyNewClientsSummary); // Add new route

module.exports = router;
