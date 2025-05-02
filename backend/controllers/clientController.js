const Client = require('../models/Client');
const Loan = require('../models/Loan');
const Installment = require('../models/Installment');
const PaymentHistory = require('../models/PaymentHistory'); // Corrected import
const pool = require('../config/db'); // Import pool for direct queries if needed

exports.addClient = async (req, res) => {
  const { name, nic, address, telephone } = req.body;

  if (!name || !nic || !address || !telephone) {
    return res.status(400).json({ message: 'Name, NIC, Address, and Telephone are required' });
  }

  // Basic validation (can be expanded)
  if (nic.length < 10) { // Example NIC length validation
      return res.status(400).json({ message: 'Invalid NIC format.' });
  }
  if (telephone.length < 10) { // Example phone length validation
      return res.status(400).json({ message: 'Invalid telephone number format.' });
  }

  try {
    // The model now handles duplicate NIC check
    const clientId = await Client.create(name, nic, address, telephone);
    res.status(201).json({ message: 'Client created successfully', clientId });
  } catch (error) {
    console.error('Error adding client:', error);
    // Send specific error message from model if available
    if (error.message === 'Client with this NIC already exists.') {
        return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error creating client' });
  }
};

exports.getAllClients = async (req, res) => {
  try {
    const clients = await Client.getAll();
    res.status(200).json(clients);
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({ message: 'Server error fetching clients' });
  }
};

exports.getClientById = async (req, res) => {
  const { id } = req.params;
  try {
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Optionally fetch related loans and installments here too
    const loans = await Loan.findByClientId(id);
    // You might want to fetch installments for each loan if needed on this view
    // const clientData = { ...client, loans };

    res.status(200).json(client); // Send only client data for now, fetch loans separately if needed
  } catch (error) {
    console.error(`Error getting client ${id}:`, error);
    res.status(500).json({ message: 'Server error fetching client details' });
  }
};

exports.updateClient = async (req, res) => {
  const { id } = req.params;
  const { name, nic, address, telephone } = req.body;

  if (!name || !nic || !address || !telephone) {
    return res.status(400).json({ message: 'Name, NIC, address, and telephone are required' });
  }

  try {
    const affectedRows = await Client.update(id, name, nic, address, telephone);
    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Client not found or no changes made' });
    }
    res.status(200).json({ message: 'Client updated successfully' });
  } catch (error) {
    console.error(`Error updating client ${id}:`, error);
    res.status(500).json({ message: 'Server error updating client' });
  }
};

// --- Delete Client and Associated Data ---
exports.deleteClient = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection(); // Get connection for transaction

  try {
      await connection.beginTransaction();

      // 1. Find all loans associated with the client
      const loans = await Loan.findByClientId(id, connection); // Pass connection

      if (loans.length > 0) {
          const loanIds = loans.map(loan => loan.loan_id);

          // 2. Find all installment IDs for these loans
          let allInstallmentIds = [];
          for (const loanId of loanIds) {
              const installmentIds = await Installment.findIdsByLoanId(loanId, connection); // Pass connection
              allInstallmentIds = allInstallmentIds.concat(installmentIds);
          }

          // 3. Delete payment history associated with these installments (if any)
          if (allInstallmentIds.length > 0) {
              await PaymentHistory.deleteByInstallmentIds(allInstallmentIds, connection); // Pass connection
          }

          // 4. Delete installments associated with these loans
          for (const loanId of loanIds) {
              await Installment.deleteByLoanId(loanId, connection); // Pass connection
          }

          // 5. Delete the loans
          for (const loanId of loanIds) {
              await Loan.delete(loanId, connection); // Pass connection
          }
      }

      // 6. Delete the client
      const affectedRows = await Client.delete(id, connection); // Pass connection

      if (affectedRows === 0) {
          await connection.rollback(); // Rollback if client not found/deleted
          return res.status(404).json({ message: 'Client not found' });
      }

      await connection.commit(); // Commit transaction
      res.status(200).json({ message: 'Client and all associated data deleted successfully' });

  } catch (error) {
      await connection.rollback(); // Rollback on any error
      console.error(`Error deleting client ${id}:`, error);
      res.status(500).json({ message: 'Server error deleting client' });
  } finally {
      connection.release(); // Always release connection
  }
};

// --- New Search Function ---
exports.searchClients = async (req, res) => {
  const { q } = req.query; // Search query parameter

  if (!q || q.trim().length < 2) { // Require at least 2 characters for search
    return res.status(400).json({ message: 'Search term must be at least 2 characters long' });
  }

  try {
    const clients = await Client.searchByNameOrNicOrPhone(q.trim());
    res.status(200).json(clients);
  } catch (error) {
    console.error('Error searching clients:', error);
    res.status(500).json({ message: 'Server error searching clients' });
  }
};

exports.getClientDetailsWithLoans = async (req, res) => {
  const { id } = req.params;
  try {
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const loans = await Loan.findByClientId(id);
    const loansWithInstallments = [];

    for (const loan of loans) {
        const installments = await Installment.findByLoanId(loan.id);
        loansWithInstallments.push({ ...loan, installments });
    }

    res.status(200).json({ ...client, loans: loansWithInstallments });
  } catch (error) {
    console.error(`Error getting client details ${id}:`, error);
    res.status(500).json({ message: 'Server error fetching client details' });
  }
};

// --- New Controller Function for Client Summary DATA (JSON) ---
exports.getClientSummary = async (req, res) => {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    console.log(`[Controller] Fetching Client Summary Data for Client ID: ${clientId}, Dates: ${startDate} to ${endDate}`); // Added log

    if (!clientId || !startDate || !endDate) {
        return res.status(400).json({ message: 'Client ID, start date, and end date are required.' });
    }

    try {
        // 1. Check if client exists
        console.log(`[Controller] Checking existence for Client ID: ${clientId}`);
        const client = await Client.findById(clientId);
        if (!client) {
            console.log(`[Controller] Client not found for ID: ${clientId}`); // Added log
            return res.status(404).json({ message: 'Client not found.' });
        }
        console.log(`[Controller] Client found: ${client.name}`);

        // 2. Fetch necessary data using Model methods
        console.log(`[Controller] Fetching summary data for Client ID: ${clientId}`); // Updated log

        console.log(`[Controller] Fetching total remaining balance...`);
        const totalRemainingBalanceResult = await Loan.getTotalRemainingBalanceByClient(clientId);
        console.log(`[Controller] Raw total remaining balance:`, totalRemainingBalanceResult);
        const totalRemainingBalance = parseFloat(totalRemainingBalanceResult || 0);

        console.log(`[Controller] Fetching total due for active loans...`);
        const totalDueActiveLoansResult = await Loan.getTotalDueForActiveLoansByClient(clientId);
        console.log(`[Controller] Raw total due active loans:`, totalDueActiveLoansResult);
        const totalDueActiveLoans = parseFloat(totalDueActiveLoansResult || 0);

        console.log(`[Controller] Fetching total paid in range...`);
        // Corrected model name from Payment to PaymentHistory
        const totalPaidInRangeResult = await PaymentHistory.getTotalPaidByClientInRange(clientId, startDate, endDate);
        console.log(`[Controller] Raw total paid in range:`, totalPaidInRangeResult);
        const totalPaidInRange = parseFloat(totalPaidInRangeResult || 0);
        console.log(`[Controller] Parsed Summary Data: Balance=${totalRemainingBalance}, Due=${totalDueActiveLoans}, Paid=${totalPaidInRange}`);


        // 3. Construct the summary object
        const summaryData = {
            // Include basic client info if needed
            // clientId: client.client_id,
            // clientName: client.name,
            overallSummary: {
                total_remaining_balance_all_loans: totalRemainingBalance,
                total_due_all_active_loans: totalDueActiveLoans,
                total_paid_in_range_all_loans: totalPaidInRange,
            },
            // Optionally include detailed lists if needed by the frontend later
            // activeLoans: [],
            // completedLoans: [],
            // paymentsInRange: [],
        };

        console.log(`[Controller] Sending summary data for Client ID: ${clientId}`, summaryData); // Added log
        res.status(200).json(summaryData);

    } catch (error) {
        // Log the specific error that occurred during data fetching or processing
        console.error(`[Controller] Error fetching client summary data for client ${clientId}:`, error); // Added log
        res.status(500).json({ message: 'Server error fetching client summary data.' });
    }
};
// --- End New Controller Function ---

// --- New Controller Function for Loan Summary ---
exports.getClientLoanSummary = async (req, res) => {
    const { clientId } = req.params;

    try {
        // 1. Find active or recently paid loans for the client
        const loans = await Loan.findByClientIdWithDetails(clientId);

        if (!loans || loans.length === 0) {
            return res.status(200).json({ loanSummaries: [] }); // Return empty array if no loans
        }

        // 2. For each loan, gather summary details
        const loanSummaries = await Promise.all(loans.map(async (loan) => {
            const installments = await Installment.findByLoanId(loan.loan_id);
            const paidCount = await Installment.countByLoanIdAndStatus(loan.loan_id, 'paid');
            const pendingCount = await Installment.countByLoanIdAndStatus(loan.loan_id, 'pending');
            // const overdueCount = await Installment.countByLoanIdAndStatus(loan.loan_id, 'overdue'); // Add if needed

            const nextPendingInstallment = await Installment.findNextPendingInstallment(loan.loan_id);

            return {
                loan_id: loan.loan_id,
                principal_amount: loan.principal_amount,
                interest_rate: loan.interest_rate,
                total_amount_due: loan.total_amount_due, // Assuming this is calculated and stored
                remaining_balance: loan.remaining_balance, // Assuming this is tracked
                status: loan.status,
                installments_paid: paidCount,
                installments_remaining: pendingCount, // Or total - paidCount
                next_payment_date: loan.next_payment_date, // Use the stored next payment date
                next_installment_id: nextPendingInstallment ? nextPendingInstallment.installment_id : null,
                next_installment_amount: nextPendingInstallment ? nextPendingInstallment.amount_due : null,
                // Add other relevant loan details if needed
            };
        }));

        res.status(200).json({ loanSummaries });

    } catch (error) {
        console.error(`Error fetching loan summary for client ${clientId}:`, error);
        res.status(500).json({ message: 'Server error fetching loan summary' });
    }
};