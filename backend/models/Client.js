const pool = require('../config/db');

const Client = {
  async create(name, nic, address, telephone) {
    // Check for duplicate NIC before inserting
    const checkSql = 'SELECT client_id FROM clients WHERE nic = ?';
    const [existing] = await pool.query(checkSql, [nic]);
    if (existing.length > 0) {
      throw new Error('Client with this NIC already exists.');
    }

    const sql = 'INSERT INTO clients (name, nic, address, telephone) VALUES (?, ?, ?, ?)';
    const [result] = await pool.query(sql, [name, nic, address, telephone]);
    return result.insertId;
  },

  async findById(id) {
    const sql = 'SELECT * FROM clients WHERE client_id = ?';
    const [rows] = await pool.query(sql, [id]);
    return rows[0];
  },

  async getAll() {
    const sql = 'SELECT * FROM clients ORDER BY created_at DESC';
    const [rows] = await pool.query(sql);
    return rows;
  },

  async update(id, name, nic, address, telephone) {
    // Optional: Check if NIC is being changed to one that already exists (excluding the current client)
    const checkSql = 'SELECT client_id FROM clients WHERE nic = ? AND client_id != ?';
    const [existing] = await pool.query(checkSql, [nic, id]);
    if (existing.length > 0) {
      throw new Error('Another client with this NIC already exists.');
    }

    const sql = 'UPDATE clients SET name = ?, nic = ?, address = ?, telephone = ? WHERE client_id = ?';
    const [result] = await pool.query(sql, [name, nic, address, telephone, id]);
    return result.affectedRows;
  },

  async delete(id) {
    // Add check for existing loans before deleting?
    // const checkLoansSql = 'SELECT loan_id FROM loans WHERE client_id = ? LIMIT 1';
    // const [loans] = await pool.query(checkLoansSql, [id]);
    // if (loans.length > 0) {
    //   throw new Error('Cannot delete client with existing loans.');
    // }
    const sql = 'DELETE FROM clients WHERE client_id = ?';
    const [result] = await pool.query(sql, [id]);
    return result.affectedRows;
  },

  async searchByNameOrNicOrPhone(searchTerm) {
    const query = `%${searchTerm}%`;
    const sql = `
      SELECT client_id, name, nic, telephone
      FROM clients
      WHERE name LIKE ? OR nic LIKE ? OR telephone LIKE ?
      LIMIT 10`; // Limit results for performance
    const [rows] = await pool.query(sql, [query, query, query]);
    return rows;
  }
};

module.exports = Client;