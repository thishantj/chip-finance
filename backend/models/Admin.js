const pool = require('../config/db');
const bcrypt = require('bcrypt');
const saltRounds = 10; // Cost factor for hashing

exports.create = async (name, username, password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    // Use correct column names from schema: admin_name, password_hash
    const [result] = await pool.query(
      'INSERT INTO admins (admin_name, username, password_hash) VALUES (?, ?, ?)',
      [name, username, hashedPassword]
    );
    return result.insertId;
  } catch (error) {
    console.error('Error creating admin:', error);
    throw error; // Re-throw the error to be caught by the controller
  }
};

exports.findByUsername = async (username) => {
  try {
    // Select specific columns to avoid exposing hash unnecessarily elsewhere if needed
    const [rows] = await pool.query('SELECT admin_id, admin_name, username, password_hash FROM admins WHERE username = ?', [username]);
    return rows[0]; // Returns the admin object or undefined
  } catch (error) {
    console.error('Error finding admin by username:', error);
    throw error;
  }
};

exports.verifyPassword = async (inputPassword, hashedPassword) => {
  try {
    return await bcrypt.compare(inputPassword, hashedPassword);
  } catch (error) {
    console.error('Error verifying password:', error);
    throw error;
  }
};

// Add this method to find an admin by ID (including hash for verification)
exports.findById = async (adminId) => {
  try {
    const [rows] = await pool.query('SELECT admin_id, admin_name, username, password_hash, created_at FROM admins WHERE admin_id = ?', [adminId]);
    return rows[0]; // Returns the admin object or undefined
  } catch (error) {
    console.error(`Error finding admin by ID ${adminId}:`, error);
    throw error;
  }
};

// Add this method to get all admins (excluding password hash)
exports.getAll = async () => {
  try {
    const [rows] = await pool.query('SELECT admin_id, admin_name, username, created_at FROM admins ORDER BY created_at DESC');
    return rows;
  } catch (error) {
    console.error('Error getting all admins:', error);
    throw error;
  }
};

// Add this method to update an admin by ID
exports.updateById = async (adminId, name, hashedPassword) => {
    try {
        let query = 'UPDATE admins SET admin_name = ?';
        const params = [name];

        if (hashedPassword) {
            query += ', password_hash = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE admin_id = ?';
        params.push(adminId);

        const [result] = await pool.query(query, params);
        return result.affectedRows; // Returns 1 if updated, 0 if not found
    } catch (error) {
        console.error(`Error updating admin with ID ${adminId}:`, error);
        throw error;
    }
};

// Add this method to delete an admin by ID
exports.deleteById = async (adminId) => {
  try {
    const [result] = await pool.query('DELETE FROM admins WHERE admin_id = ?', [adminId]);
    return result.affectedRows; // Returns 1 if deleted, 0 if not found
  } catch (error) {
    console.error(`Error deleting admin with ID ${adminId}:`, error);
    throw error;
  }
};