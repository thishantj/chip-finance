const express = require('express');
const installmentController = require('../controllers/installmentController');
// Change 'protect' to 'isAuthenticated' based on usage in other route files
const isAuthenticated = require('../middleware/authMiddleware');

const router = express.Router();

// Get installments for a specific loan
// Use isAuthenticated middleware
router.get('/loan/:loanId', isAuthenticated, installmentController.getInstallmentsByLoanId);

// Mark an installment as paid
// Change to POST to accept request body
// Use isAuthenticated middleware
router.post('/:id/pay', isAuthenticated, installmentController.markInstallmentPaid);

// --- New Route for Upcoming Installments ---
// Use isAuthenticated middleware
router.get('/upcoming', isAuthenticated, installmentController.getUpcomingInstallments);
// --- End New Route ---


// Potentially add routes for getting a single installment, updating, deleting (if needed)
// router.get('/:id', isAuthenticated, installmentController.getInstallmentById); // Update middleware here too if uncommented

module.exports = router;