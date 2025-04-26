const express = require('express');
const clientController = require('../controllers/clientController');
const isAuthenticated = require('../middleware/authMiddleware'); // Reuse the same auth middleware

const router = express.Router();

// All client routes require authentication (only admins can manage clients)
router.use(isAuthenticated);

router.get('/', clientController.getAllClients); // GET all clients
router.post('/add', clientController.addClient); // POST add a new client
router.get('/search', clientController.searchClients); // Add search route
router.get('/:id', clientController.getClientById);
router.put('/:id', clientController.updateClient);
router.delete('/:id', clientController.deleteClient); // DELETE a client by ID
router.get('/:id/details', clientController.getClientDetailsWithLoans); // Keep if needed elsewhere

// --- New Route for Loan Summary ---
router.get('/:clientId/loan-summary', clientController.getClientLoanSummary);
// --- End New Route ---

module.exports = router;