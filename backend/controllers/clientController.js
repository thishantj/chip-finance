const Client = require('../models/Client');
const Loan = require('../models/Loan');
const Installment = require('../models/Installment');

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

exports.deleteClient = async (req, res) => {
  const { id } = req.params; // ID of the client to delete

  // Note: Unlike admins, we might not need to prevent deleting oneself here,
  // unless clients can log in and manage their own data. Assuming only admins manage clients.

  try {
      const affectedRows = await Client.deleteById(id);
      if (affectedRows === 0) {
          return res.status(404).json({ message: 'Client not found.' });
      }
      res.status(200).json({ message: 'Client deleted successfully.' });
  } catch (error) {
      console.error(`Error deleting client ${id}:`, error);
      res.status(500).json({ message: 'Server error deleting client.' });
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

// --- New Controller Function for Loan Summary ---
exports.getClientLoanSummary = async (req, res) => {
    const { clientId } = req.params;
    try {
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        const activeLoans = await Loan.findActiveByClientId(clientId);
        const loanSummaries = [];

        for (const loan of activeLoans) {
            const nextInstallment = await Installment.findNextPendingInstallment(loan.loan_id);
            const paidCount = await Installment.countByLoanIdAndStatus(loan.loan_id, 'paid');
            // Use countPendingByLoanId to specifically count installments with 'pending' status
            const pendingCount = await Installment.countPendingByLoanId(loan.loan_id);

            loanSummaries.push({
                loan_id: loan.loan_id,
                principal_amount: loan.principal_amount,
                total_amount_due: loan.total_amount_due,
                remaining_balance: loan.remaining_balance,
                next_payment_date: nextInstallment ? nextInstallment.due_date : null,
                next_installment_id: nextInstallment ? nextInstallment.installment_id : null,
                next_installment_amount: nextInstallment ? nextInstallment.amount_due : null,
                installments_paid: paidCount,
                installments_remaining: pendingCount, // Correctly uses count of pending installments
                loan_status: loan.status,
            });
        }

        res.status(200).json({ client, loanSummaries });

    } catch (error) {
        console.error(`Error getting loan summary for client ${clientId}:`, error);
        res.status(500).json({ message: 'Server error fetching loan summary' });
    }
};
// --- End New Controller Function ---