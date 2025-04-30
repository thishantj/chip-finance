const express = require('express');
const adminController = require('../controllers/adminController');
const isAuthenticated = require('../middleware/authMiddleware'); // Import the middleware

const router = express.Router();

// Public routes
router.post('/login', adminController.loginAdmin);
router.get('/check-auth', isAuthenticated, adminController.checkAuth); // Protect check-auth as well to get user info

// Routes requiring authentication
router.get('/', isAuthenticated, adminController.getAllAdmins); // GET all admins
router.post('/add', isAuthenticated, adminController.addAdmin); // Protect this route
router.put('/update/:id', isAuthenticated, adminController.updateAdmin); // Add PUT route for updates
router.delete('/:id', isAuthenticated, adminController.deleteAdmin); // DELETE an admin
router.post('/logout', isAuthenticated, adminController.logoutAdmin); // User must be logged in to log out


// Add other admin-related routes here, protecting them with isAuthenticated as needed
module.exports = router;