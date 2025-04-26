const pool = require('../config/db');

const Installment = {
  async createMany(installmentsData) {
    if (!installmentsData || installmentsData.length === 0) {
      return 0;
    }
    // Ensure amount_due is included if it's part of the table schema
    const sql = `INSERT INTO installments (loan_id, installment_number, due_date, amount_due) VALUES ?`;
    // Map data to match columns: [ [loan_id, number, due_date, amount_due], ... ]
    const values = installmentsData.map(inst => [inst[0], inst[1], inst[2], inst[3]]); // Assuming amount_due is the 4th element
    const [result] = await pool.query(sql, [values]);
    return result.affectedRows;
  },

  async findByLoanId(loanId) {
    const sql = 'SELECT * FROM installments WHERE loan_id = ? ORDER BY installment_number ASC';
    const [rows] = await pool.query(sql, [loanId]);
    return rows;
  },

  // --- New Method: Find the next pending installment for a loan ---
  async findNextPendingInstallment(loanId) {
    const sql = `SELECT * FROM installments
                 WHERE loan_id = ? AND status = 'pending'
                 ORDER BY due_date ASC, installment_number ASC
                 LIMIT 1`;
    const [rows] = await pool.query(sql, [loanId]);
    return rows[0]; // Returns the single next installment or undefined
  },
  // --- End New Method ---

  // --- New Method: Find subsequent pending installments ---
  async findSubsequentPending(loanId, currentInstallmentNumber) {
    const sql = `SELECT * FROM installments
                 WHERE loan_id = ? AND status = 'pending' AND installment_number > ?
                 ORDER BY installment_number ASC`;
    const [rows] = await pool.query(sql, [loanId, currentInstallmentNumber]);
    return rows;
  },
  // --- End New Method ---

  // --- New Method: Update amount_due for an installment ---
  async updateAmountDue(installmentId, newAmountDue) {
      // Ensure amount doesn't go below zero
      const finalAmount = Math.max(0, newAmountDue);
      const sql = `UPDATE installments SET amount_due = ? WHERE installment_id = ?`;
      const [result] = await pool.query(sql, [finalAmount, installmentId]);
      return result.affectedRows;
  },
  // --- End New Method ---

  async findById(id) {
    const sql = 'SELECT * FROM installments WHERE installment_id = ?';
    const [rows] = await pool.query(sql, [id]);
    return rows[0];
  },

  // Modified markAsPaid to handle zero amount payments (from overpayment)
  async markAsPaid(id, paymentDate, paidAmount) {
    // Allow marking as paid even if paidAmount is 0 (covered by overpayment)
    const sql = `UPDATE installments SET status = 'paid', payment_date = ?, paid_amount = ? WHERE installment_id = ? AND status != 'paid'`;
    const [result] = await pool.query(sql, [paymentDate, paidAmount, id]);
    return result.affectedRows;
  },

  async countPendingByLoanId(loanId) {
    const sql = `SELECT COUNT(*) as pending_count FROM installments WHERE loan_id = ? AND status = 'pending'`;
    const [rows] = await pool.query(sql, [loanId]);
    return rows[0].pending_count;
  },

  // --- New Method: Count installments by status for a loan ---
  async countByLoanIdAndStatus(loanId, status) {
    const sql = `SELECT COUNT(*) as count FROM installments WHERE loan_id = ? AND status = ?`;
    const [rows] = await pool.query(sql, [loanId, status]);
    return rows[0].count;
  },
  // --- End New Method ---

  // --- New Method: Find upcoming installments across all clients ---
  async findUpcoming(limit = 50) { // Add a default limit
    const sql = `
      SELECT
        i.installment_id, i.loan_id, i.installment_number, i.due_date, i.amount_due, i.status,
        l.client_id,
        c.name as client_name, c.nic as client_nic
      FROM installments i
      JOIN loans l ON i.loan_id = l.loan_id
      JOIN clients c ON l.client_id = c.client_id
      WHERE i.status IN ('pending', 'overdue') -- Or just 'pending' if overdue is handled differently
      ORDER BY i.due_date ASC, c.name ASC
      LIMIT ?`; // Apply limit in the query
    const [rows] = await pool.query(sql, [limit]);
    return rows;
  },
  // --- End New Method ---

  // --- New Method: Find Installment IDs by Loan ID ---
  async findIdsByLoanId(loanId) {
    const sql = 'SELECT installment_id FROM installments WHERE loan_id = ?';
    const [rows] = await pool.query(sql, [loanId]);
    return rows.map(row => row.installment_id); // Return an array of IDs
  },
  // --- End New Method ---

  async deleteByLoanId(loanId) {
    const sql = 'DELETE FROM installments WHERE loan_id = ?';
    const [result] = await pool.query(sql, [loanId]);
    return result.affectedRows;
  },

  // --- New Method: Find all pending installments for a loan ---
  async findAllPendingByLoanId(loanId) {
    const sql = `SELECT * FROM installments
                 WHERE loan_id = ? AND status = 'pending'
                 ORDER BY installment_number ASC`;
    const [rows] = await pool.query(sql, [loanId]);
    return rows; // Returns an array of pending installments
  },
  // --- End New Method ---

  // Add function to get installments due soon for SMS notifications if needed later
  // ...
};

module.exports = Installment;
