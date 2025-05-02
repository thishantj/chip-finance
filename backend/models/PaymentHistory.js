const pool = require('../config/db');

class PaymentHistory {
  async create(installmentId, amountPaid, recordedByAdminId = null) {
    const sql = `INSERT INTO payment_history (installment_id, amount_paid, recorded_by_admin)
                 VALUES (?, ?, ?)`;
    // Use null for recorded_by_admin if not provided or not implemented yet
    const [result] = await pool.query(sql, [installmentId, amountPaid, recordedByAdminId]);
    return result.insertId;
  }

  async findByInstallmentId(installmentId) {
    const sql = 'SELECT * FROM payment_history WHERE installment_id = ? ORDER BY payment_date DESC';
    const [rows] = await pool.query(sql, [installmentId]);
    return rows;
  }

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

  // --- Method made STATIC: Get Total Paid by Client in Date Range ---
  static async getTotalPaidByClientInRange(clientId, startDate, endDate) {
    const sql = `
      SELECT SUM(ph.amount_paid) as totalPaid
      FROM payment_history ph
      JOIN installments i ON ph.installment_id = i.installment_id
      JOIN loans l ON i.loan_id = l.loan_id
      WHERE l.client_id = ? AND ph.payment_date BETWEEN ? AND ?`;
    try {
        const [rows] = await pool.query(sql, [clientId, startDate, endDate]);
        return rows[0]?.totalPaid || 0;
    } catch (error) {
        console.error(`Error fetching total paid for client ${clientId} in range (${startDate} - ${endDate}):`, error);
        throw error; // Re-throw the error
    }
  }

  // --- New Method: Get Total Paid Across All Clients in Date Range ---
  static async getTotalPaidInRange(startDate, endDate) {
    const sql = `
      SELECT SUM(amount_paid) as totalPaid
      FROM payment_history
      WHERE payment_date BETWEEN ? AND ?`;
    try {
        const [rows] = await pool.query(sql, [startDate, endDate]);
        return rows[0]?.totalPaid || 0;
    } catch (error) {
        console.error(`Error fetching total paid in range (${startDate} - ${endDate}):`, error);
        throw error; // Re-throw the error to be handled by the caller
    }
  }

  // Add other necessary methods like findByLoanId, findByClientId etc. if needed later
}

module.exports = PaymentHistory;
