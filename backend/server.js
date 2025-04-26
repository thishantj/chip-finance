const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pool = require('./config/db'); // Ensure db config is correct
require('dotenv').config();

// Import Routes
const adminRoutes = require('./routes/adminRoutes');
const clientRoutes = require('./routes/clientRoutes');
const loanRoutes = require('./routes/loanRoutes');
const installmentRoutes = require('./routes/installmentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); // Import dashboard routes

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors({
    origin: 'http://localhost:3000', // Your frontend URL
    credentials: true // Allow cookies to be sent
}));
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_very_secret_key', // Use environment variable
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (requires HTTPS)
        httpOnly: true, // Prevent client-side JS from accessing the cookie
        maxAge: 1000 * 60 * 60 * 24 // Cookie expiry time (e.g., 1 day)
        // sameSite: 'lax' // Or 'strict' or 'none' (if needed for cross-site requests with secure=true)
    }
}));

// API Routes
app.use('/api/admins', adminRoutes);
app.use('/api/clients', clientRoutes); // Use client routes with base path /api/clients
app.use('/api/loans', loanRoutes);
app.use('/api/installments', installmentRoutes);
app.use('/api/dashboard', dashboardRoutes); // Register dashboard routes

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Micro-Finance Backend API Running');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown (optional but good practice)
process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing MySQL pool');
  try {
    const pool = require('./config/db'); // Get pool instance
    await pool.end();
    console.log('MySQL pool closed');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MySQL pool:', err);
    process.exit(1);
  }
});