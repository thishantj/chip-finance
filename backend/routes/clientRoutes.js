const express = require('express');
const clientController = require('../controllers/clientController');
const isAuthenticated = require('../middleware/authMiddleware'); // Reuse the same auth middleware

const router = express.Router();

// --- Log when clientRoutes is hit ---
router.use((req, res, next) => {
  console.log(`[ClientRoutes] Processing request for: ${req.method} ${req.path}`);
  next();
});
// --- End Log ---

// All client routes require authentication (only admins can manage clients)
router.use(isAuthenticated);

router.get('/', clientController.getAllClients); // GET all clients
router.post('/add', clientController.addClient); // POST add a new client
router.get('/search', clientController.searchClients); // Add search route

// --- Ensure this route exists ---
// GET /api/clients/:clientId/summary - Fetches JSON summary data
router.get('/:clientId/summary', (req, res, next) => { // Add specific log before controller
    console.log(`[ClientRoutes] Matched route GET /:clientId/summary for clientId: ${req.params.clientId}`);
    next();
} , clientController.getClientSummary);
// --- End Ensure this route exists ---

router.get('/:id', clientController.getClientById);
router.put('/:id', clientController.updateClient);
router.delete('/:id', clientController.deleteClient); // DELETE a client by ID
router.get('/:id/details', clientController.getClientDetailsWithLoans); // Keep if needed elsewhere
router.get('/:clientId/loan-summary', clientController.getClientLoanSummary); // Keep for installment page

module.exports = router;