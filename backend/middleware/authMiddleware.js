const jwt = require('jsonwebtoken');
require('dotenv').config();

const isAuthenticated = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  // Check if token exists
  if (!token) {
    // console.log('Auth middleware: No token provided'); // Debug log
    return res.status(401).json({ message: 'Unauthorized: No token provided.' });
  }

  try {
    // Verify token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('Auth middleware: JWT_SECRET is not defined in .env file');
        return res.status(500).json({ message: 'Server configuration error: JWT secret missing.' });
    }

    const decoded = jwt.verify(token, secret);

    // Add user payload to request object
    req.user = decoded; // Contains { id: admin.admin_id, username: admin.username, ... }
    // console.log('Auth middleware: Token verified, user:', req.user); // Debug log
    next(); // Proceed to the next middleware or route handler

  } catch (error) {
    // console.log('Auth middleware: Token verification failed:', error.message); // Debug log
    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Unauthorized: Token expired.' });
    }
    return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
  }
};

module.exports = isAuthenticated;
