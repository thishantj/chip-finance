const express = require('express');
const loanController = require('../controllers/loanController');
// const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Add authMiddleware if needed
router.post('/', /* authMiddleware, */ loanController.addLoan);
router.get('/client/:clientId', /* authMiddleware, */ loanController.getLoansByClientId);
router.get('/', /* authMiddleware, */ loanController.getAllLoans); // Get all loans
router.delete('/:id', /* authMiddleware, */ loanController.deleteLoan); // Add DELETE route

// Add PUT/PATCH route for updates later if needed
// router.put('/:id', /* authMiddleware, */ loanController.updateLoan);

module.exports = router;