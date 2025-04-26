const Installment = require('../models/Installment');
const Loan = require('../models/Loan');
const PaymentHistory = require('../models/PaymentHistory');

// --- Helper Function for Date Formatting (YYYY-MM-DD) ---
function formatDate(date) {
    if (!date) return null; // Handle null or undefined dates
    // Ensure it's a Date object
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return null; // Handle invalid dates

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
// --- End Helper Function ---

// --- Helper Function for Recalculating Installments ---
async function recalculatePendingInstallments(loanId, paymentDateForZeroing = null) {
    try {
        const updatedLoan = await Loan.findById(loanId);
        const newRemainingBalance = updatedLoan.remaining_balance;
        const pendingInstallments = await Installment.findAllPendingByLoanId(loanId);
        const numberOfPending = pendingInstallments.length;

        if (numberOfPending === 0) {
            console.log(`Loan ${loanId}: Recalculation triggered, but no pending installments found.`);
            return { recalculated: false, message: "No pending installments to recalculate." };
        }

        if (newRemainingBalance > 0.005) {
            // Calculate the equal amount for each remaining installment
            const newInstallmentAmount = parseFloat((newRemainingBalance / numberOfPending).toFixed(2));
            let totalApplied = 0;
            console.log(`Loan ${loanId}: Recalculating ${numberOfPending} pending installments. New equal amount: ${newInstallmentAmount}`);

            // Update all but the last installment with the calculated equal amount
            for (let i = 0; i < numberOfPending - 1; i++) {
                const inst = pendingInstallments[i];
                const amountToApply = Math.max(0, newInstallmentAmount); // Ensure non-negative
                await Installment.updateAmountDue(inst.installment_id, amountToApply);
                totalApplied += amountToApply;
                console.log(`  - Updated installment ${inst.installment_id} to ${amountToApply.toFixed(2)}`);
            }

            // Adjust the last installment to cover the exact remaining balance difference due to rounding
            const lastInstallment = pendingInstallments[numberOfPending - 1];
            const lastInstallmentAmount = parseFloat((newRemainingBalance - totalApplied).toFixed(2));
            const finalLastAmount = Math.max(0, lastInstallmentAmount); // Ensure non-negative
            await Installment.updateAmountDue(lastInstallment.installment_id, finalLastAmount);
            console.log(`  - Updated last installment ${lastInstallment.installment_id} to ${finalLastAmount.toFixed(2)} to match remaining balance.`);

            return { recalculated: true, message: `Recalculated ${numberOfPending} pending installments equally.` };
        } else {
            // Remaining balance is effectively zero. Mark all pending as paid with 0 amount.
            console.log(`Loan ${loanId}: Remaining balance near zero after payment. Clearing ${numberOfPending} pending installments.`);
            for (const inst of pendingInstallments) {
                await Installment.updateAmountDue(inst.installment_id, 0);
                // Use the provided payment date when zeroing out due to payment
                if (paymentDateForZeroing) {
                    await Installment.markAsPaid(inst.installment_id, paymentDateForZeroing, 0);
                }
            }
            return { recalculated: true, zeroed: true, message: `Cleared ${numberOfPending} remaining installments.` };
        }
    } catch (error) {
        console.error(`Loan ${loanId}: Error during recalculation:`, error);
        // Decide if this should throw or just return an error state
        return { recalculated: false, error: true, message: "Error during recalculation." };
    }
}
// --- End Recalculation Helper ---

// Add exports. to make the function available
exports.getInstallmentsByLoanId = async (req, res) => {
  const { loanId } = req.params;
  try {
    const installments = await Installment.findByLoanId(loanId);
    res.status(200).json(installments);
  } catch (error) {
    console.error(`Error getting installments for loan ${loanId}:`, error);
    res.status(500).json({ message: 'Server error fetching installments' });
  }
};

exports.markInstallmentPaid = async (req, res) => { // Or payInstallment
  const { id } = req.params; // Installment ID
  const { paidAmount } = req.body;

  if (paidAmount === undefined || paidAmount === null || isNaN(parseFloat(paidAmount)) || parseFloat(paidAmount) <= 0) {
      return res.status(400).json({ message: 'Valid positive paid amount is required.' });
  }

  const paymentDate = new Date();
  const paidAmountNum = parseFloat(paidAmount);

  try {
    const installment = await Installment.findById(id);
    if (!installment) {
      return res.status(404).json({ message: 'Installment not found' });
    }
    if (installment.status === 'paid') {
        return res.status(400).json({ message: 'Installment is already marked as paid' });
    }

    const originalAmountDue = installment.amount_due;
    const loanId = installment.loan_id;
    let message = '';
    let loanStatusUpdated = false;
    let nextDueDate = null;
    let recalculationResult = null;

    // --- Record Payment History (Always record the attempt) ---
    await PaymentHistory.create(id, paidAmountNum, null);

    // --- Handle Payment Cases ---
    if (paidAmountNum >= originalAmountDue - 0.005) { // Payment covers the installment (or overpayment)
        // --- Mark current installment as paid ---
        await Installment.markAsPaid(id, paymentDate, paidAmountNum);

        // --- Update Loan Remaining Balance for the original due amount ---
        await Loan.decreaseRemainingBalance(loanId, originalAmountDue);

        // --- Handle Overpayment ---
        const overpayment = paidAmountNum - originalAmountDue;
        if (overpayment > 0.005) {
            message = `Payment recorded successfully with overpayment of ${overpayment.toFixed(2)}. `;
            await Loan.decreaseRemainingBalance(loanId, overpayment); // Decrease by overpayment
            recalculationResult = await recalculatePendingInstallments(loanId, paymentDate); // Recalculate after overpayment
            message += recalculationResult.message;
        } else {
            message = 'Payment recorded successfully. ';
            // Recalculate even on exact payment to ensure consistency if previous state was off
            recalculationResult = await recalculatePendingInstallments(loanId, paymentDate);
            message += recalculationResult.message;
        }

        // --- Update Loan Status and Next Payment Date (Common for exact/overpayment) ---
        const nextPendingInstallment = await Installment.findNextPendingInstallment(loanId);
        nextDueDate = nextPendingInstallment ? formatDate(nextPendingInstallment.due_date) : null;
        await Loan.updateNextPaymentDate(loanId, nextDueDate);

        const pendingCount = await Installment.countPendingByLoanId(loanId);
        if (pendingCount === 0) {
          await Loan.updateStatus(loanId, 'fully_paid');
          if (nextDueDate !== null) {
              await Loan.updateNextPaymentDate(loanId, null);
              nextDueDate = null;
          }
          console.log(`Loan ${loanId} marked as fully_paid.`);
          loanStatusUpdated = true;
          message += ' Loan is now fully paid.';
        }
        // --- End Update Loan Status ---

    } else {
        // --- Handle Underpayment ---
        const amountStillDue = originalAmountDue - paidAmountNum;
        message = `Partial payment of ${paidAmountNum.toFixed(2)} recorded. Installment remains pending. Amount previously due: ${originalAmountDue.toFixed(2)}. `;

        // Reduce balance ONLY by the amount paid
        await Loan.decreaseRemainingBalance(loanId, paidAmountNum);

        // Recalculate ALL pending installments (including this one)
        recalculationResult = await recalculatePendingInstallments(loanId); // No payment date needed for zeroing here
        message += recalculationResult.message;

        // Next due date remains the current installment's due date as it's still pending
        nextDueDate = formatDate(installment.due_date);
        // Ensure loan's next payment date reflects this if it changed
        await Loan.updateNextPaymentDate(loanId, nextDueDate);
    }

    res.status(200).json({
        message: message.trim(),
        nextPaymentDate: nextDueDate,
        loanStatusUpdated: loanStatusUpdated,
        recalculated: recalculationResult?.recalculated || false,
        zeroed: recalculationResult?.zeroed || false, // Indicate if remaining installments were zeroed
    });

  } catch (error) {
    console.error(`Error processing payment for installment ${id}:`, error);
    res.status(500).json({ message: 'Server error processing payment' });
  }
};

// --- New Controller Function ---
exports.getUpcomingInstallments = async (req, res) => {
    try {
        // You could add query params for limit, offset, date range later
        const upcomingInstallments = await Installment.findUpcoming();
        res.status(200).json(upcomingInstallments);
    } catch (error) {
        console.error('Error fetching upcoming installments:', error);
        res.status(500).json({ message: 'Server error fetching upcoming installments' });
    }
};
// --- End New Controller Function ---