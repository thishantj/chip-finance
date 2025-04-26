const Loan = require('../models/Loan');
const Installment = require('../models/Installment');
const Client = require('../models/Client');
const PaymentHistory = require('../models/PaymentHistory'); // Import the new model

exports.addLoan = async (req, res) => {
  // Expecting core parameters from frontend
  const {
      client_id: clientId,
      principal_amount: principal,
      interest_rate: interestRate, // Expect annual rate % from frontend
      loan_term_days: loanTermDays, // Expect term already in days
      installment_frequency_days: installmentFrequencyDays,
      // installment_amount: frontendInstallmentAmount // Removed: Backend calculates this now via Loan.create -> calculateInstallments
  } = req.body;


  // --- Input Validation & Parsing ---
  // Keep validation for required fields and basic types
  if (!clientId || !principal || !interestRate || !loanTermDays || !installmentFrequencyDays) {
    return res.status(400).json({ message: 'Client ID, principal, interest rate, loan term (days), and frequency (days) are required' });
  }

  const principalNum = parseFloat(principal);
  const rateNum = parseFloat(interestRate);
  const termDaysNum = parseInt(loanTermDays, 10);
  const frequencyDaysNum = parseInt(installmentFrequencyDays, 10);

  if (isNaN(principalNum) || principalNum <= 0 ||
      isNaN(rateNum) || rateNum < 0 || // Allow 0%?
      isNaN(termDaysNum) || termDaysNum <= 0 ||
      isNaN(frequencyDaysNum) || frequencyDaysNum <= 0) {
      return res.status(400).json({ message: 'Invalid numeric values for loan details.' });
  }
  if (termDaysNum < frequencyDaysNum) {
      return res.status(400).json({ message: 'Loan term cannot be less than installment frequency.' });
  }
  // --- End Input Validation ---

  // --- Remove Backend Calculation Logic (handled by Loan.create -> calculateInstallments) ---
  // const rateDecimal = rateNum / 100;
  // const totalAmountDue = principalNum * (1 + rateDecimal);
  // const numberOfInstallments = Math.ceil(termDaysNum / frequencyDaysNum);
  // --- End Remove Backend Calculation Logic ---

  try {
    // Verify client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // --- Remove Next Payment Date Calculation (handled by Loan.create -> calculateInstallments) ---
    // const startDate = new Date();
    // const nextPaymentDate = addDays(startDate, frequencyDaysNum);
    // const formattedNextPaymentDate = formatDate(nextPaymentDate);
    // --- End Remove Next Payment Date Calculation ---

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

    // --- Remove Installment Generation Logic (handled by Loan.create) ---
    // const installmentsToCreate = [];
    // ... loop ...
    // if (installmentsToCreate.length > 0) {
    //   await Installment.createMany(installmentsToCreate);
    // }
    // --- End Remove Installment Generation Logic ---

    // Fetch the newly created loan details to return calculated values if needed
    // (Optional, Loan.create could potentially return more details)
    const newLoan = await Loan.findById(loanId); // Fetch to get calculated amounts

    res.status(201).json({
        message: 'Loan created successfully',
        loanId: loanId,
        // Return calculated values from the created loan record
        totalAmountDue: newLoan ? newLoan.total_amount_due : null,
        installmentAmount: newLoan ? newLoan.installment_amount : null,
        // numberOfInstallments: numberOfInstallments // Can be derived or added to Loan.findById if needed
    });

  } catch (error) {
    console.error('Error adding loan:', error);
    // Check for specific errors (e.g., from calculateInstallments or DB)
    res.status(500).json({ message: error.message || 'Server error creating loan' });
  }
};

exports.getLoansByClientId = async (req, res) => {
    const { clientId } = req.params;
    try {
        const loans = await Loan.findByClientId(clientId);
        res.status(200).json(loans);
    } catch (error) {
        console.error(`Error getting loans for client ${clientId}:`, error);
        res.status(500).json({ message: 'Server error fetching loans' });
    }
};

exports.getAllLoans = async (req, res) => {
    try {
        const loans = await Loan.findAll();
        res.status(200).json(loans);
    } catch (error) {
        console.error('Error getting all loans:', error);
        res.status(500).json({ message: 'Server error fetching all loans' });
    }
};

// --- Updated Delete Loan Function ---
exports.deleteLoan = async (req, res) => {
    const { id } = req.params; // Loan ID

    try {
        // Optional: Check if loan exists first
        const loan = await Loan.findById(id);
        if (!loan) {
            return res.status(404).json({ message: 'Loan not found.' });
        }

        // 1. Find all installment IDs for the loan
        const installmentIds = await Installment.findIdsByLoanId(id);

        // 2. Delete associated payment history records (if any installments exist)
        if (installmentIds.length > 0) {
            const deletedHistoryCount = await PaymentHistory.deleteByInstallmentIds(installmentIds);
        }

        // 3. Delete associated installments
        const deletedInstallmentsCount = await Installment.deleteByLoanId(id);

        // 4. Then delete the loan itself
        const affectedRows = await Loan.delete(id);
        if (affectedRows === 0) {
            // This case might be redundant if we check existence above, but good for safety
            return res.status(404).json({ message: 'Loan not found or already deleted.' });
        }

        res.status(200).json({ message: 'Loan, associated installments, and payment history deleted successfully.' });
    } catch (error) {
        console.error(`Error deleting loan ${id}:`, error);
        // Check for specific errors, e.g., foreign key constraints if not handled above
        res.status(500).json({ message: 'Server error deleting loan.' });
    }
};
// --- End Updated Delete Loan Function ---

// Add getLoanById if needed
// exports.getLoanById = async (req, res) => { ... }

// Add updateLoan if needed
// exports.updateLoan = async (req, res) => { ... }