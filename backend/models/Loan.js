const pool = require('../config/db');
// Correct the import path and ensure the utility exists
const { calculateInstallments } = require('../utils/loanCalculator');
const Installment = require('./Installment'); // Import Installment model for deletion cascade

const Loan = {
  async create(loanData) {
    const {
      client_id,
      principal_amount,
      interest_rate, // Expecting annual rate %
      loan_term_days,
      installment_frequency_days,
      // Note: total_amount_due, installment_amount are calculated now
    } = loanData;

    // Perform validation if needed (e.g., ensure values are positive)
    if (!client_id || principal_amount <= 0 || interest_rate < 0 || loan_term_days <= 0 || installment_frequency_days <= 0) {
        throw new Error("Invalid loan data provided to Loan.create");
    }

    // Use the utility function to get all calculated values
    const {
      totalAmountDue,
      installmentAmount, // Use the calculated installment amount
      installments // Get the generated installment schedule
    } = calculateInstallments(principal_amount, interest_rate, loan_term_days, installment_frequency_days);

    // Initialize remaining_balance with the total amount due
    const initialRemainingBalance = totalAmountDue;
    const firstDueDate = installments.length > 0 ? installments[0].due_date : null; // Get the first due date from the schedule

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert the loan using calculated values
      const loanSql = `
        INSERT INTO loans (
          client_id, principal_amount, interest_rate, loan_term_days,
          installment_frequency_days, total_amount_due, installment_amount,
          status, next_payment_date, remaining_balance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const [loanResult] = await connection.query(loanSql, [
        client_id, principal_amount, interest_rate, loan_term_days,
        installment_frequency_days, totalAmountDue, installmentAmount, // Use calculated values
        'active', firstDueDate, initialRemainingBalance
      ]);
      const loanId = loanResult.insertId;

      // Insert installments generated by the utility function
      if (installments && installments.length > 0) {
        const installmentSql = `
          INSERT INTO installments (loan_id, installment_number, due_date, amount_due, status)
          VALUES ?`; // Use bulk insert
        const installmentValues = installments.map(inst => [
          loanId,
          inst.installment_number,
          inst.due_date,
          inst.amount_due, // Use amount_due from calculation
          'pending'
        ]);
        await connection.query(installmentSql, [installmentValues]);
      }

      await connection.commit();
      return loanId; // Return the new loan ID

    } catch (error) {
      await connection.rollback();
      console.error("Error creating loan in transaction:", error);
      throw error; // Re-throw the error to be handled by the controller
    } finally {
      connection.release();
    }
  },

  // Modified findAll method to include remaining_balance AND telephone
  async findAll() {
    // Ensure client details are joined correctly and select remaining_balance and telephone
    const sql = `
      SELECT
        l.*,
        c.name as client_name,
        c.nic as client_nic,
        c.telephone as client_telephone -- Added telephone
      FROM loans l
      JOIN clients c ON l.client_id = c.client_id
      ORDER BY l.created_at DESC`;
    const [rows] = await pool.query(sql);
    return rows;
  },

  // Modified findById method to include remaining_balance
  async findById(id) {
    const sql = `
        SELECT
            l.*,
            c.name as client_name,
            c.nic as client_nic
        FROM loans l
        JOIN clients c ON l.client_id = c.client_id
        WHERE l.loan_id = ?`;
    const [rows] = await pool.query(sql, [id]);
    return rows[0];
  },

  async findByClientId(clientId, connection = pool) { // Accept optional connection
    const sql = `
      SELECT l.*, c.name as client_name
      FROM loans l
      JOIN clients c ON l.client_id = c.client_id
      WHERE l.client_id = ?
      ORDER BY l.created_at DESC`;
    const [rows] = await connection.query(sql, [clientId]); // Use connection
    return rows;
  },

  // --- New Method: Find only active loans for a client ---
  async findActiveByClientId(clientId) {
    const sql = `SELECT l.*, c.name as client_name, c.nic as client_nic
                 FROM loans l
                 JOIN clients c ON l.client_id = c.client_id
                 WHERE l.client_id = ? AND l.status = 'active'
                 ORDER BY l.created_at DESC`;
    const [rows] = await pool.query(sql, [clientId]);
    return rows;
  },
  // --- End New Method ---

  // --- New Method: Find loans with details for client loan summary ---
  async findByClientIdWithDetails(clientId) {
      const sql = `
          SELECT l.*, c.name as client_name, c.nic as client_nic
          FROM loans l
          JOIN clients c ON l.client_id = c.client_id
          WHERE l.client_id = ?
          ORDER BY l.created_at DESC`;
      const [rows] = await pool.query(sql, [clientId]);
      return rows;
  },
  // --- End New Method ---

  async getAllWithClientNames() {
     const sql = `
      SELECT l.*, c.name as client_name, c.nic as client_nic, l.status
      FROM loans l
      JOIN clients c ON l.client_id = c.client_id
      ORDER BY l.created_at DESC`;
     const [rows] = await pool.query(sql);
     return rows;
  },

  async update(id, loanData) {
    const fields = Object.keys(loanData);
    const values = Object.values(loanData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');

    if (!setClause) {
      throw new Error('No fields provided for update.');
    }

    const sql = `UPDATE loans SET ${setClause} WHERE loan_id = ?`;
    const [result] = await pool.query(sql, [...values, id]);
    return result.affectedRows;
  },

  async updateStatus(loanId, status) {
    const sql = 'UPDATE loans SET status = ? WHERE loan_id = ?';
    const [result] = await pool.query(sql, [status, loanId]);
    return result.affectedRows;
  },

  // --- New Method: Update next_payment_date ---
  async updateNextPaymentDate(loanId, nextDate) {
    // If nextDate is null or undefined, set the DB field to NULL
    const sql = `UPDATE loans SET next_payment_date = ? WHERE loan_id = ?`;
    const [result] = await pool.query(sql, [nextDate, loanId]);
    return result.affectedRows;
  },
  // --- End New Method ---

  // --- New Method: Decrease remaining_balance ---
  async decreaseRemainingBalance(loanId, amountToDecrease) {
      if (amountToDecrease <= 0) return 0; // Don't update if amount is zero or negative
      // Ensure amountToDecrease is treated as a number
      const decreaseAmount = parseFloat(amountToDecrease);
      if (isNaN(decreaseAmount) || decreaseAmount <= 0) {
          console.warn(`Invalid amount passed to decreaseRemainingBalance: ${amountToDecrease}`);
          return 0;
      }
      const sql = `UPDATE loans SET remaining_balance = GREATEST(0, remaining_balance - ?) WHERE loan_id = ?`;
      const [result] = await pool.query(sql, [decreaseAmount, loanId]);
      return result.affectedRows;
  },
  // --- End New Method ---

  // --- New Method: Get Total Remaining Balance for a Client ---
  async getTotalRemainingBalanceByClient(clientId) {
      const sql = `SELECT SUM(remaining_balance) as totalRemaining FROM loans WHERE client_id = ?`;
      const [rows] = await pool.query(sql, [clientId]);
      return rows[0]?.totalRemaining || 0;
  },
  // --- End New Method ---

  // --- New Method: Get Total Due for Active Loans for a Client ---
  async getTotalDueForActiveLoansByClient(clientId) {
      const sql = `SELECT SUM(total_amount_due) as totalDueActive FROM loans WHERE client_id = ? AND status = 'active'`;
      const [rows] = await pool.query(sql, [clientId]);
      return rows[0]?.totalDueActive || 0;
  },
  // --- End New Method ---

  async delete(id, connection = pool) { // Accept optional connection
    // Before deleting the loan, delete associated installments
    await Installment.deleteByLoanId(id, connection); // Pass connection

    const sql = 'DELETE FROM loans WHERE loan_id = ?';
    const [result] = await connection.query(sql, [id]); // Use connection
    return result.affectedRows;
  }
};

module.exports = Loan;