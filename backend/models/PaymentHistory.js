const pool = require('../config/db');

const PaymentHistory = {
  async create(installmentId, amountPaid, recordedByAdminId = null) {
    const sql = `INSERT INTO payment_history (installment_id, amount_paid, recorded_by_admin)
                 VALUES (?, ?, ?)`;
    // Use null for recorded_by_admin if not provided or not implemented yet
    const [result] = await pool.query(sql, [installmentId, amountPaid, recordedByAdminId]);
    return result.insertId;
  },

  async findByInstallmentId(installmentId) {
    const sql = 'SELECT * FROM payment_history WHERE installment_id = ? ORDER BY payment_date DESC';
    const [rows] = await pool.query(sql, [installmentId]);
    return rows;
  },

  // Method to delete payment history records based on a list of installment IDs
  async deleteByInstallmentIds(installmentIds) {
    if (!installmentIds || installmentIds.length === 0) {
      return 0; // No IDs provided, nothing to delete
    }
    // Create placeholders for the IN clause (e.g., ?, ?, ?)
    const placeholders = installmentIds.map(() => '?').join(',');
    const sql = `DELETE FROM payment_history WHERE installment_id IN (${placeholders})`;
    const [result] = await pool.query(sql, installmentIds);
    return result.affectedRows;
  }

  // Add other necessary methods like findByLoanId, findByClientId etc. if needed later
};

module.exports = PaymentHistory;
