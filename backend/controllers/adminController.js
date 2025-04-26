const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
require('dotenv').config(); // Ensure dotenv is configured to access JWT_SECRET

exports.addAdmin = async (req, res) => {
  const { name, username, password } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({ message: 'Name, username, and password are required' });
  }

  try {
    const existingAdmin = await Admin.findByUsername(username);
    if (existingAdmin) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Password hashing is now handled by the model's create method
    const adminId = await Admin.create(name, username, password);
    res.status(201).json({ message: 'Admin created successfully', adminId });
  } catch (error) {
    // Log the detailed error but send a generic message to the client
    console.error('Error adding admin:', error);
    // Check for specific database errors if needed, e.g., duplicate entry
    if (error.code === 'ER_DUP_ENTRY') {
         return res.status(400).json({ message: 'Username already exists.' });
    }
    res.status(500).json({ message: 'Server error creating admin' });
  }
};

exports.loginAdmin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const admin = await Admin.findByUsername(username);
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' }); // User not found
    }

    const isMatch = await Admin.verifyPassword(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' }); // Password incorrect
    }

    // --- Generate JWT Token ---
    const payload = {
      id: admin.admin_id,
      username: admin.username,
      // Add other relevant non-sensitive info if needed
    };
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('JWT_SECRET is not defined in .env file');
        return res.status(500).json({ message: 'Server configuration error: JWT secret missing.' });
    }
    const options = { expiresIn: '1d' }; // Token expires in 1 day (adjust as needed)

    const token = jwt.sign(payload, secret, options);
    // --- End Generate JWT Token ---


    // Remove session establishment if solely relying on JWT
    // req.session.adminId = admin.admin_id;
    // req.session.adminUsername = admin.username;
    // console.log('Session established:', req.session); // Debug log


    // Return token along with admin info (excluding hash)
    res.status(200).json({
        message: 'Login successful',
        token: token, // Include the generated token
        admin: { id: admin.admin_id, username: admin.username, name: admin.admin_name }
    });

  } catch (error) {
    console.error('Error logging in admin:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

exports.logoutAdmin = (req, res) => {
  // For JWT, logout is primarily handled client-side by deleting the token.
  // This endpoint can remain for potential future use (e.g., token blacklisting)
  // or simply acknowledge the logout request.
  // No session to destroy.
  res.status(200).json({ message: 'Logout acknowledged.' });
};

exports.checkAuth = (req, res) => {
  // console.log('Checking auth, session:', req.session); // Debug log
  // Use req.user from the isAuthenticated middleware if using JWT
  if (req.user) {
    // Send back admin info including the ID
    res.status(200).json({ isAuthenticated: true, admin: { id: req.user.id, username: req.user.username /* add name if needed */ } });
  } else {
    res.status(401).json({ isAuthenticated: false });
  }
};

// Add this function to get all admins
exports.getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.getAll();
        res.status(200).json(admins);
    } catch (error) {
        console.error('Error getting all admins:', error);
        res.status(500).json({ message: 'Server error fetching admins' });
    }
};

// Add this function to delete an admin
exports.deleteAdmin = async (req, res) => {
    const { id } = req.params; // ID of the admin to delete
    const loggedInAdminId = req.user.id; // ID of the admin making the request (from JWT payload)

    if (parseInt(id, 10) === loggedInAdminId) {
        return res.status(403).json({ message: 'You cannot delete your own account.' });
    }

    try {
        const affectedRows = await Admin.deleteById(id);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Admin not found.' });
        }
        res.status(200).json({ message: 'Admin deleted successfully.' });
    } catch (error) {
        console.error(`Error deleting admin ${id}:`, error);
        res.status(500).json({ message: 'Server error deleting admin.' });
    }
};