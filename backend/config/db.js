const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Function to attempt connection with retries
const connectWithRetry = async (retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log('MySQL Connected...');
      connection.release();
      return; // Success, exit the function
    } catch (err) {
      console.error(`Error connecting to MySQL (Attempt ${i + 1}/${retries}):`, err.message);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('Failed to connect to the database after multiple retries. Exiting...');
        process.exit(1); // Exit the process if all retries fail
      }
    }
  }
};

// Test connection on startup
connectWithRetry();

module.exports = pool;