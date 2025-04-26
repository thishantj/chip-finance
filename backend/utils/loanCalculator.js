// Helper functions (can be kept here or moved to a separate date utils file)
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Calculates total amount due, installment amount, and generates installment schedule
 * using a flat interest rate model.
 *
 * @param {number} principalAmount The initial loan amount.
 * @param {number} annualInterestRate The annual interest rate (e.g., 10 for 10%).
 * @param {number} loanTermDays The total duration of the loan in days.
 * @param {number} installmentFrequencyDays The number of days between installments.
 * @returns {object} An object containing totalAmountDue, installmentAmount, numberOfInstallments, and installments array.
 */
function calculateInstallments(principalAmount, annualInterestRate, loanTermDays, installmentFrequencyDays) {
    if (principalAmount <= 0 || annualInterestRate < 0 || loanTermDays <= 0 || installmentFrequencyDays <= 0 || loanTermDays < installmentFrequencyDays) {
        throw new Error("Invalid input parameters for loan calculation.");
    }

    const rateDecimal = annualInterestRate / 100;
    const totalAmountDue = parseFloat((principalAmount * (1 + rateDecimal)).toFixed(2));
    const numberOfInstallments = Math.ceil(loanTermDays / installmentFrequencyDays);

    let installmentAmount = 0;
    if (numberOfInstallments > 0) {
        installmentAmount = parseFloat((totalAmountDue / numberOfInstallments).toFixed(2));
    }

    const installments = [];
    let remainingAmount = totalAmountDue;
    const startDate = new Date(); // Use current date as the basis for first payment
    let currentDueDate = addDays(startDate, installmentFrequencyDays); // First payment due after one frequency period

    for (let i = 1; i <= numberOfInstallments; i++) {
        let currentInstallmentAmount = installmentAmount;

        // Adjust last installment to match totalAmountDue exactly
        if (i === numberOfInstallments) {
            currentInstallmentAmount = remainingAmount; // Last installment covers the exact remaining balance
            // Ensure it's not negative due to floating point issues
            if (currentInstallmentAmount < 0) currentInstallmentAmount = 0;
        } else {
            // Ensure installment doesn't exceed remaining amount (can happen with rounding)
            if (currentInstallmentAmount > remainingAmount) {
                currentInstallmentAmount = remainingAmount;
            }
        }

        // Round to 2 decimal places for currency
        currentInstallmentAmount = parseFloat(currentInstallmentAmount.toFixed(2));

        installments.push({
            installment_number: i,
            due_date: formatDate(currentDueDate),
            amount_due: currentInstallmentAmount
        });

        remainingAmount = parseFloat((remainingAmount - currentInstallmentAmount).toFixed(2)); // Decrease remaining amount
        currentDueDate = addDays(currentDueDate, installmentFrequencyDays); // Next due date
    }

     // Final check for rounding errors after loop
     if (Math.abs(remainingAmount) > 0.01 && installments.length > 0) {
        console.warn(`Loan Calculation: Small discrepancy (${remainingAmount.toFixed(2)}) after generating installments. Adjusting last.`);
        const lastIndex = installments.length - 1;
        installments[lastIndex].amount_due = parseFloat((installments[lastIndex].amount_due + remainingAmount).toFixed(2));
     }


    return {
        totalAmountDue,
        installmentAmount, // The calculated (or base) installment amount
        numberOfInstallments,
        installments // Array of { installment_number, due_date, amount_due }
    };
}

module.exports = { calculateInstallments, formatDate, addDays }; // Export helpers if needed elsewhere
