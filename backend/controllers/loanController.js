const Loan = require("../models/Loan");
const Installment = require("../models/Installment");
const Client = require("../models/Client");
const PaymentHistory = require("../models/PaymentHistory"); // Import the new model

exports.addLoan = async (req, res) => {
  const {
    client_id: clientId,
    principal_amount: principal,
    interest_rate: interestRate, // Expect annual rate % from frontend
    loan_term_days: loanTermDays, // Expect term already in days
    installment_frequency_days: installmentFrequencyDays,
  } = req.body;

  // --- Input Validation & Parsing ---
  if (
    !clientId ||
    !principal ||
    !interestRate ||
    !loanTermDays ||
    !installmentFrequencyDays
  ) {
    return res
      .status(400)
      .json({
        message:
          "Client ID, principal, interest rate, loan term (days), and frequency (days) are required",
      });
  }

  const principalNum = parseFloat(principal);
  const rateNum = parseFloat(interestRate);
  const termDaysNum = parseInt(loanTermDays, 10);
  const frequencyDaysNum = parseInt(installmentFrequencyDays, 10);

  if (
    isNaN(principalNum) ||
    principalNum <= 0 ||
    isNaN(rateNum) ||
    rateNum < 0 || // Allow 0%?
    isNaN(termDaysNum) ||
    termDaysNum <= 0 ||
    isNaN(frequencyDaysNum) ||
    frequencyDaysNum <= 0
  ) {
    return res
      .status(400)
      .json({ message: "Invalid numeric values for loan details." });
  }
  if (termDaysNum < frequencyDaysNum) {
    return res
      .status(400)
      .json({
        message: "Loan term cannot be less than installment frequency.",
      });
  }
  // --- End Input Validation ---

  try {
    // Verify client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Prepare data for Loan.create
    const loanData = {
      client_id: clientId,
      principal_amount: principalNum,
      interest_rate: rateNum,
      loan_term_days: termDaysNum,
      installment_frequency_days: frequencyDaysNum,
    };

    // Call Loan.create which now handles calculations and installment insertion
    const loanId = await Loan.create(loanData);

    // Fetch the newly created loan details to return calculated values if needed
    const newLoan = await Loan.findById(loanId); // Fetch to get calculated amounts

    res.status(201).json({
      message: "Loan created successfully",
      loanId: loanId,
      totalAmountDue: newLoan ? newLoan.total_amount_due : null,
      installmentAmount: newLoan ? newLoan.installment_amount : null,
    });
  } catch (error) {
    console.error("Error adding loan:", error);
    res
      .status(500)
      .json({ message: error.message || "Server error creating loan" });
  }
};

exports.getLoansByClientId = async (req, res) => {
  const { clientId } = req.params;
  try {
    const loans = await Loan.findByClientId(clientId);
    res.status(200).json(loans);
  } catch (error) {
    console.error(`Error getting loans for client ${clientId}:`, error);
    res.status(500).json({ message: "Server error fetching loans" });
  }
};

exports.getAllLoans = async (req, res) => {
  try {
    const loans = await Loan.findAll();
    res.status(200).json(loans);
  } catch (error) {
    console.error("Error getting all loans:", error);
    res.status(500).json({ message: "Server error fetching all loans" });
  }
};

// --- Updated Delete Loan Function ---
exports.deleteLoan = async (req, res) => {
  const { id } = req.params; // Loan ID

  try {
    // Optional: Check if loan exists first
    const loan = await Loan.findById(id);
    if (!loan) {
      return res.status(404).json({ message: "Loan not found." });
    }

    // 1. Find all installment IDs for the loan
    const installmentIds = await Installment.findIdsByLoanId(id);

    // 2. Delete associated payment history records (if any installments exist)
    if (installmentIds.length > 0) {
      const deletedHistoryCount = await PaymentHistory.deleteByInstallmentIds(
        installmentIds
      );
    }

    // 3. Delete associated installments
    const deletedInstallmentsCount = await Installment.deleteByLoanId(id);

    // 4. Then delete the loan itself
    const affectedRows = await Loan.delete(id);
    if (affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Loan not found or already deleted." });
    }

    res
      .status(200)
      .json({
        message:
          "Loan, associated installments, and payment history deleted successfully.",
      });
  } catch (error) {
    console.error(`Error deleting loan ${id}:`, error);
    // Check for specific errors, e.g., foreign key constraints if not handled above
    res.status(500).json({ message: "Server error deleting loan." });
  }
};
// --- End Updated Delete Loan Function ---

// Add updateLoan if needed
exports.updateLoan = async (req, res) => {
  const { id } = req.params;
  const {
    principal_amount,
    interest_rate,
    loan_term_days,
    installment_frequency_days,
    installment_amount,
  } = req.body;

  // --- Input Validation ---
  const principalNum = parseFloat(principal_amount);
  const rateNum = parseFloat(interest_rate);
  const termDaysNum = parseInt(loan_term_days, 10);
  const frequencyDaysNum = parseInt(installment_frequency_days, 10);
  const installmentNum = parseFloat(installment_amount); // Use the provided installment amount

  if (
    isNaN(principalNum) ||
    principalNum <= 0 ||
    isNaN(rateNum) ||
    rateNum < 0 ||
    isNaN(termDaysNum) ||
    termDaysNum <= 0 ||
    isNaN(frequencyDaysNum) ||
    frequencyDaysNum <= 0 ||
    isNaN(installmentNum) ||
    installmentNum <= 0
  ) {
    // Validate installmentNum
    return res
      .status(400)
      .json({ message: "Invalid numeric values for loan details." });
  }
  if (termDaysNum < frequencyDaysNum) {
    return res
      .status(400)
      .json({
        message: "Loan term cannot be less than installment frequency.",
      });
  }

  // Validate that the provided installment amount isn't leading to negative interest
  const numInstallmentsForValidation = Math.ceil(
    termDaysNum / frequencyDaysNum
  );
  const totalRepaymentForValidation =
    installmentNum * numInstallmentsForValidation;
  if (totalRepaymentForValidation < principalNum) {
    return res
      .status(400)
      .json({
        message:
          "Provided installment amount is too low, resulting in negative interest.",
      });
  }
  // --- End Input Validation ---

  const connection = await pool.getConnection(); // For transaction

  try {
    await connection.beginTransaction();

    const existingLoan = await Loan.findById(id, connection);
    if (!existingLoan) {
      await connection.rollback();
      return res.status(404).json({ message: "Loan not found" });
    }
    if (existingLoan.status === "fully_paid") {
      await connection.rollback();
      return res
        .status(400)
        .json({ message: "Cannot update a fully paid loan." });
    }

    // Delete existing payment history and installments for this loan
    const installmentIds = await Installment.findIdsByLoanId(id, connection);
    if (installmentIds.length > 0) {
      await PaymentHistory.deleteByInstallmentIds(installmentIds, connection);
    }
    await Installment.deleteByLoanId(id, connection);

    const loanData = {
      principal_amount: principalNum,
      interest_rate: rateNum,
      loan_term_days: termDaysNum,
      installment_frequency_days: frequencyDaysNum,
    };

    const updatedLoanDataForModel = {
      ...loanData,
      installment_amount: installmentNum, // Pass the validated installment amount
    };

    const affectedRows = await Loan.update(
      id,
      updatedLoanDataForModel,
      connection
    );

    if (affectedRows === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ message: "Loan not found or no changes made." });
    }

    // Fetch updated loan to return its new calculated values
    const updatedLoan = await Loan.findById(id, connection);

    await connection.commit();
    res.json({
      message: "Loan updated successfully",
      loan: updatedLoan, // Return the full updated loan object
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating loan:", error);
    // Check for specific errors (e.g., from calculateInstallments or DB)
    if (
      error.message.includes("Invalid loan data") ||
      error.message.includes("negative interest")
    ) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to update loan" });
  } finally {
    if (connection) connection.release();
  }
};
