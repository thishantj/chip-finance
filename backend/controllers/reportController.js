const Client = require('../models/Client');
const Loan = require('../models/Loan');
const Installment = require('../models/Installment');
const PaymentHistory = require('../models/PaymentHistory'); // Corrected model name
const PDFDocument = require('pdfkit'); // Import pdfkit
const { formatDate, formatCurrency } = require('../utils/formatter'); // Assuming you have or create a currency formatter

// --- Helper function for drawing lines (can be shared or redefined) ---
const drawLine = (doc, y, color = '#cccccc', weight = 0.5) => {
    const pageMargin = 50; // Assuming margin is 50
    doc.moveTo(pageMargin, y)
       .lineTo(doc.page.width - pageMargin, y)
       .lineWidth(weight)
       .strokeColor(color)
       .stroke();
    doc.strokeColor('black'); // Reset stroke color
};

// --- Helper Function (Using pdfkit) ---
const generateClientSummaryPdf = async (res, client, startDate, endDate) => {
    // Keep bufferPages for potential future multi-page reports
    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    const pageMargin = 50;
    const contentWidth = doc.page.width - pageMargin * 2;

    // --- Stream Error Handling ---
    doc.on('error', (err) => {
        console.error('[PDF Helper] PDFDocument stream error (Client Summary):', err);
        errorOccurred = true;
        if (!res.headersSent) {
            try { res.status(500).json({ message: 'Error generating PDF document stream.' }); } catch (e) { console.error("Error sending JSON error response:", e); }
        } else if (!res.writableEnded) {
             try { res.end(); } catch (e) { console.error("Error ending response stream:", e); }
        }
    });
    res.on('error', (err) => {
        console.error('[PDF Helper] Response stream error (Client Summary):', err);
        errorOccurred = true;
        if (doc.writable) {
            try { doc.destroy(err); } catch (e) { console.error("Error destroying doc stream:", e); }
        }
    });
     res.on('close', () => {
        if (!res.writableEnded) {
             console.warn(`[PDF Helper] WARNING: Response stream closed prematurely (Client Summary ID: ${client.client_id}).`);
             streamClosedPrematurely = true;
             if (doc.writable) {
                 try { doc.destroy(); } catch (e) { console.error("Error destroying doc stream on close:", e); }
             }
        } else {
             console.log(`[PDF Helper] Response stream closed normally (Client Summary ID: ${client.client_id}).`);
        }
    });
    doc.on('finish', () => {
        console.log(`[PDF Helper] PDFDocument stream finished writing (Client Summary ID: ${client.client_id}).`);
    });
    // --- End Stream Error Handling ---

    // Pipe the PDF document directly to the response stream
    doc.pipe(res);

    // --- PDF Content ---
    try {

        // 1. Company Header
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text('SUN PIVOTAL INVESTMENTS.', { align: 'center' });
        doc.moveDown(1.5); // Space after company header

        // 2. Report Title and Period
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text(`Client Summary: ${client.name}`, { align: 'center' });
        doc.moveDown(0.5); // Space between title and period
        doc.fontSize(11)
           .font('Helvetica')
           .text(`Report Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, { align: 'center' });
        doc.moveDown(2.5); // Space before content sections

        // 3. Client Details Section
        doc.fontSize(14).font('Helvetica-Bold').text('Client Details');
        drawLine(doc, doc.y + 5); // Use helper function
        doc.moveDown(1);
        doc.font('Helvetica').fontSize(10); // Reset font for details
        doc.text(`Client ID: ${client.client_id}`);
        doc.moveDown(0.3); // Add space
        doc.text(`NIC: ${client.nic || 'N/A'}`);
        doc.moveDown(0.3); // Add space
        doc.text(`Address: ${client.address || 'N/A'}`);
        doc.moveDown(0.3); // Add space
        doc.text(`Telephone: ${client.telephone || 'N/A'}`);
        doc.moveDown(2); // Space after client details

        // 4. Fetch Summary Data (Robust fetching)
        let totalRemainingBalance = 0, totalDueActiveLoans = 0, totalPaidInRange = 0;
        try {
            totalRemainingBalance = parseFloat(await Loan.getTotalRemainingBalanceByClient(client.client_id) || 0);
            totalDueActiveLoans = parseFloat(await Loan.getTotalDueForActiveLoansByClient(client.client_id) || 0);
            totalPaidInRange = parseFloat(await PaymentHistory.getTotalPaidByClientInRange(client.client_id, startDate, endDate) || 0);
        } catch (fetchError) {
            console.error(`[PDF Helper] Error fetching summary numbers for Client ${client.client_id}:`, fetchError);
            // Optionally add an error note to the PDF here if needed
            doc.fillColor('red').text('Error: Could not fetch summary financial data.', { align: 'center' }).fillColor('black');
        }

        // 5. Overall Summary Section
        doc.fontSize(14).font('Helvetica-Bold').text('Overall Summary');
        drawLine(doc, doc.y + 5);
        doc.moveDown(1);
        doc.font('Helvetica').fontSize(11); // Reset font
        // Use left/right alignment
        let summaryY = doc.y;
        doc.text(`Total Remaining Balance (All Loans):`, pageMargin, summaryY, { width: contentWidth * 0.7, align: 'left' });
        doc.text(formatCurrency(totalRemainingBalance), pageMargin, summaryY, { width: contentWidth, align: 'right' });
        doc.moveDown(0.5);
        summaryY = doc.y;
        doc.text(`Total Due (Active Loans):`, pageMargin, summaryY, { width: contentWidth * 0.7, align: 'left' });
        doc.text(formatCurrency(totalDueActiveLoans), pageMargin, summaryY, { width: contentWidth, align: 'right' });
        doc.moveDown(0.5);
        summaryY = doc.y;
        doc.text(`Total Paid (Within Period):`, pageMargin, summaryY, { width: contentWidth * 0.7, align: 'left' });
        doc.text(formatCurrency(totalPaidInRange), pageMargin, summaryY, { width: contentWidth, align: 'right' });
        doc.moveDown(2); // Space after summary

        // 6. Fetch Loan Details
        let loans = [];
        try {
            loans = await Loan.findByClientIdWithDetails(client.client_id);
        } catch (fetchError) {
            console.error(`[PDF Helper] Error fetching loan details for Client ${client.client_id}:`, fetchError);
            doc.fillColor('red').text('Error: Could not fetch loan details.', { align: 'center' }).fillColor('black');
        }

        // 7. Loan Details Section (Enhanced)
        doc.fontSize(14).font('Helvetica-Bold').text('Loan Details');
        drawLine(doc, doc.y + 5);
        doc.moveDown(1);

        if (loans && loans.length > 0) {
            for (const [index, loan] of loans.entries()) { // Use for...of for async/await inside loop if needed later
                const loanAmount = parseFloat(loan.loan_amount || 0);
                const totalAmountDue = parseFloat(loan.total_amount_due || 0);
                const remainingBalance = parseFloat(loan.remaining_balance || 0);
                const interestRate = parseFloat(loan.interest_rate || 0);
                const termMonths = parseInt(loan.term_months || 0);
                const installmentAmount = parseFloat(loan.installment_amount || 0);

                doc.font('Helvetica-Bold').fontSize(11).text(`Loan ID: ${loan.loan_id} (${loan.status})`);
                doc.moveDown(0.2); // Add space
                doc.font('Helvetica').fontSize(10); // Details font
                doc.text(`   Capital Amount: ${formatCurrency(loanAmount)}`);
                doc.moveDown(0.2); // Add space
                doc.text(`   Interest Rate: ${interestRate.toFixed(2)}%`);
                doc.moveDown(0.2); // Add space
                doc.text(`   Term: ${termMonths} months`);
                doc.moveDown(0.2); // Add space
                doc.text(`   Installment: ${formatCurrency(installmentAmount)}`);
                doc.moveDown(0.2); // Add space
                doc.text(`   Issued: ${formatDate(loan.created_at)}`);
                doc.moveDown(0.2); // Add space
                doc.text(`   Next Payment Due: ${formatDate(loan.next_payment_date) || 'N/A'}`);
                doc.moveDown(0.5); // Space before installments

                // 8. Fetch and Filter Paid Installment Details
                let paidInstallments = [];
                let instError = null; // Initialize instError
                try {
                    const allInstallments = await Installment.findByLoanId(loan.loan_id);
                    paidInstallments = allInstallments.filter(inst => inst.status === 'paid');
                } catch (error) {
                     instError = error; // Assign error to instError
                     console.error(`[PDF Helper] Error fetching installments for Loan ${loan.loan_id}:`, instError);
                     // Optionally log error in PDF if needed, but section will be skipped if paidInstallments is empty
                }

                // Only show Installments section if there are paid installments
                if (paidInstallments.length > 0) {
                    doc.font('Helvetica-Bold').fontSize(10).text(`   Paid Installments:`);
                    doc.moveDown(0.3);
                    doc.font('Helvetica').fontSize(9); // Smaller font for installment list
                    paidInstallments.forEach(inst => {
                        const dueDate = formatDate(inst.due_date);
                        const paymentDate = formatDate(inst.payment_date) || 'N/A'; // Should always have a date if paid
                        const amountDue = formatCurrency(inst.amount_due);
                        const paidAmount = formatCurrency(inst.paid_amount); // Should match amount_due if fully paid
                        // Indent installment details
                        doc.text(`      Due: ${dueDate} | Paid: ${paidAmount} | Paid Date: ${paymentDate}`, { indent: 10 });
                        doc.moveDown(0.15); // Smaller space between installments
                    });
                    doc.moveDown(0.5); // Space after installments list
                } else if (instError) {
                    // If there was an error fetching, mention it even if no paid ones were found
                    doc.font('Helvetica').fillColor('red').fontSize(9).text('      Error fetching installment details.', { indent: 10 }).fillColor('black');
                    doc.moveDown(0.5);
                }
                // If no paid installments and no error, the section is simply skipped.

                // Loan Sub-Totals
                doc.font('Helvetica-Bold').fontSize(10);
                doc.text(`   Total Amount Due (Loan ${loan.loan_id}): ${formatCurrency(totalAmountDue)}`);
                doc.moveDown(0.2);
                doc.text(`   Remaining Balance (Loan ${loan.loan_id}): ${formatCurrency(remainingBalance)}`);
                doc.moveDown(1); // Space after loan sub-totals

                // Add a separator line between loans, but not after the last one
                if (index < loans.length - 1) {
                    drawLine(doc, doc.y + 5, '#eeeeee', 0.5); // Lighter line between loans
                    doc.moveDown(1.5); // More space before next loan
                }
            } // End loop through loans
        } else {
            doc.font('Helvetica').fontSize(10).text('No loans found for this client.');
            doc.moveDown(1);
        }

        // --- Footer (Add ONCE at the end, centered) ---
        doc.moveDown(2); // Ensure space before footer
        const generationDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('black')
           .text(
              `Generated on: ${generationDate}`,
              pageMargin, // X starts at margin
              doc.y,      // Position below content
              {
                  align: 'center',
                  width: contentWidth
              }
           );

        doc.end();

    } catch (dataError) {
        console.error(`[PDF Helper] Error during Client Summary PDF content generation (Client ID: ${client.client_id}): ${dataError}`);
        errorOccurred = true; // Mark error occurred
        // Keep existing error handling within catch block
        try {
            if (doc.writable && !res.headersSent) {
                doc.fontSize(10).fillColor('red').text(`\n\nINTERNAL SERVER ERROR: Failed to generate complete report. Details: ${dataError.message}`);
                doc.end();
            } else if (!res.headersSent) {
                 try { res.status(500).json({ message: `Error generating client summary PDF content: ${dataError.message}` }); } catch (e) { console.error("Error sending JSON error response:", e); }
            }
        } catch (e) {
            console.error("Error adding error text to PDF or sending JSON error:", e);
            if (!res.writableEnded) {
                try { res.end(); } catch (e2) { console.error("Error force ending response stream:", e2); }
            }
        }
    }
};

// --- Updated PDF Helper for Net Profit ---
const generateNetProfitPdf = async (res, startDate, endDate) => {
    // bufferPages might not be strictly necessary now, but doesn't hurt
    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    let errorOccurred = false;
    const pageMargin = 50;
    const contentWidth = doc.page.width - pageMargin * 2;

    // --- Stream Event Handlers (Keep existing handlers) ---
    doc.on('finish', () => {
        // res should close automatically after doc finishes piping.
    });
    doc.on('error', (err) => {
        console.error('[PDF Helper] PDFDocument stream error (Net Profit):', err);
        errorOccurred = true;
        if (!res.headersSent) {
            // Try sending error response only if headers not sent
            try { res.status(500).json({ message: 'Error generating PDF document stream.' }); } catch (e) { console.error("Error sending JSON error response:", e); }
        } else if (!res.writableEnded) {
            // If headers sent, just try to end the response abruptly
            res.end();
        }
    });
    res.on('error', (err) => {
        console.error('[PDF Helper] Response stream error (Net Profit):', err);
        errorOccurred = true;
        // If response errors, destroy the source doc stream if it's still active
        if (doc.writable) {
            doc.destroy(err); // Pass error to destroy
        }
    });
    res.on('close', () => {
        // This event fires when the connection is terminated.
        if (!res.writableEnded) { // Check if response finished normally before closing.
            console.warn('[PDF Helper] WARNING: Response stream closed prematurely (Net Profit).');
            streamClosedPrematurely = true;
            // If response closes prematurely, destroy the source doc stream
            if (doc.writable) {
                doc.destroy();
            }
        } else {
            console.log('[PDF Helper] Response stream closed normally (Net Profit).');
        }
    });

    // --- Pipe the document to the response ---
    doc.pipe(res);

    // --- Add Content and Finalize the PDF Document ---
    try {

        // --- Fetch Data ---
        const totalIncome = parseFloat(await PaymentHistory.getTotalPaidInRange(startDate, endDate) || 0);
        const totalExpenses = 0.00; // Example
        const netProfit = totalIncome - totalExpenses;

        // --- PDF Content ---

        // 1. Company Header (Bigger and Bolder)
        doc.fontSize(20) // Increased font size
           .font('Helvetica-Bold')
           .text('SUN PIVOTAL INVESTMENTS.', { align: 'center' });
        doc.moveDown(2); // Increased space after header

        // 2. Report Title and Period
        doc.fontSize(16) // Slightly larger title
           .font('Helvetica-Bold')
           .text('Net Profit Report', { align: 'center' });
        doc.moveDown(0.5); // Add a small space between title and period
        doc.fontSize(11) // Slightly larger period text
           .font('Helvetica')
           .text(`Report Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, { align: 'center' });
        doc.moveDown(2.5); // More space before content

        // --- Helper function for drawing lines ---
        const drawLine = (y) => {
            doc.moveTo(pageMargin, y)
               .lineTo(doc.page.width - pageMargin, y)
               .lineWidth(0.5) // Thinner line
               .strokeColor('#cccccc') // Lighter color
               .stroke();
            doc.strokeColor('black'); // Reset stroke color
        };

        // Income Section
        doc.fontSize(14).font('Helvetica-Bold').text('Income', { underline: false }); // Larger section header, no underline
        drawLine(doc.y + 5); // Line below header
        doc.moveDown(1);
        doc.font('Helvetica').fontSize(11); // Standard content font size

        // Income Item(s) - Left align label, Right align amount
        const incomeStartY = doc.y;
        doc.text('Total Payments Received:', pageMargin, incomeStartY, { width: contentWidth * 0.7, continued: false, align: 'left' });
        doc.text(formatCurrency(totalIncome), pageMargin, incomeStartY, { width: contentWidth, continued: false, align: 'right' });
        doc.moveDown(1.5); // Space after income items

        // Total Income Line (Bolder)
        drawLine(doc.y); // Line above total
        doc.moveDown(0.5);
        const totalIncomeY = doc.y;
        doc.font('Helvetica-Bold').fontSize(11);
        doc.text('Total Income:', pageMargin, totalIncomeY, { width: contentWidth * 0.7, continued: false, align: 'left' });
        doc.text(formatCurrency(totalIncome), pageMargin, totalIncomeY, { width: contentWidth, continued: false, align: 'right' });
        doc.font('Helvetica').fontSize(11); // Reset font
        doc.moveDown(2); // More space after total income

        // Expenses Section (Placeholder)
        doc.fontSize(14).font('Helvetica-Bold').text('Expenses', { underline: false });
        drawLine(doc.y + 5); // Line below header
        doc.moveDown(1);
        doc.font('Helvetica').fontSize(11);

        // Expense Item(s) - Placeholder
        const expenseStartY = doc.y;
        doc.text('Operational Costs:', pageMargin, expenseStartY, { width: contentWidth * 0.7, continued: false, align: 'left' });
        doc.text(formatCurrency(0.00), pageMargin, expenseStartY, { width: contentWidth, continued: false, align: 'right' });
        doc.moveDown(0.5);
        const expenseNextY = doc.y;
        doc.text('Loan Write-offs:', pageMargin, expenseNextY, { width: contentWidth * 0.7, continued: false, align: 'left' });
        doc.text(formatCurrency(0.00), pageMargin, expenseNextY, { width: contentWidth, continued: false, align: 'right' });
        // Add more expense lines as needed...
        doc.moveDown(1.5); // Space after expense items

        // Total Expenses Line (Bolder)
        drawLine(doc.y); // Line above total
        doc.moveDown(0.5);
        const totalExpenseY = doc.y;
        doc.font('Helvetica-Bold').fontSize(11);
        doc.text('Total Expenses:', pageMargin, totalExpenseY, { width: contentWidth * 0.7, continued: false, align: 'left' });
        doc.text(formatCurrency(totalExpenses), pageMargin, totalExpenseY, { width: contentWidth, continued: false, align: 'right' });
        doc.font('Helvetica').fontSize(11); // Reset font
        doc.moveDown(2); // More space after total expenses

        // --- Final Net Profit/Loss ---
        drawLine(doc.y); // Line above final calculation
        doc.moveDown(0.8);

        // Final Calculation (Bolder, Larger)
        doc.fontSize(13).font('Helvetica-Bold'); // Larger font for final result
        const profitLabel = netProfit >= 0 ? 'Net Profit:' : 'Net Loss:';
        const finalY = doc.y;
        doc.text(profitLabel, pageMargin, finalY, { width: contentWidth * 0.7, continued: false, align: 'left' });
        doc.text(formatCurrency(netProfit), pageMargin, finalY, { width: contentWidth, continued: false, align: 'right' });
        doc.moveDown(0.5);
        drawLine(doc.y); // Double line under final result
        doc.moveDown(0.1);
        drawLine(doc.y);
        doc.moveDown(2); // Add space after the net profit section

        // --- Footer (Add ONCE at the end of the document content, centered) ---
        const generationDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        // Add footer text centered below the main content on the *current* (last) page
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('black')
           .text(
              `Generated on: ${generationDate}`,
              pageMargin, // X position starts at left margin
              doc.y, // Use current Y position after the moveDown
              {
                  align: 'center', // Align text to the center
                  width: contentWidth // Use the calculated content width
              }
           );

        doc.end();

    } catch (contentError) {
        console.error(`[PDF Helper] Error adding content or ending Net Profit PDF: ${contentError}`);
        errorOccurred = true;
        try {
            if (doc.writable && !res.headersSent) { // Check headersSent as well
                doc.fontSize(10).fillColor('red').text(`\n\nINTERNAL SERVER ERROR: Failed to generate complete report. Details: ${contentError.message}`);
                doc.end(); // Try to end gracefully with error message
            } else if (!res.headersSent) {
                 // If doc is not writable but headers not sent, send JSON error
                 try { res.status(500).json({ message: `Error generating PDF content: ${contentError.message}` }); } catch (e) { console.error("Error sending JSON error response:", e); }
            }
        } catch (e) {
            console.error("Error adding error text to PDF or sending JSON error:", e);
            if (!res.writableEnded) {
                res.end(); // Force end response if error handling fails
            }
        }
    }
};

// --- Client Summary Report (PDF Generation) ---
exports.generateClientSummaryReport = async (req, res) => {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;
    const action = req.path.includes('/preview') ? 'preview' : 'download';

    try {
        if (!clientId || !startDate || !endDate) {
            return res.status(400).json({ message: 'Client ID, start date, and end date are required.' });
        }
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: 'Client not found.' });
        }

        // Set Content-Disposition based on action
        const filename = `client_${clientId}_summary_${startDate}_to_${endDate}.pdf`;
        // Ensure headers are not sent before setting them
        if (!res.headersSent) {
            if (action === 'download') {
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            } else {
                 res.setHeader('Content-Disposition', `inline; filename="${filename}"`); // Also set filename for inline
            }
        } else {
             return; // Stop processing if headers are already sent
        }

        generateClientSummaryPdf(res, client, startDate, endDate);

    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ message: `Server error generating client summary report (${action}).` });
        }
    }
};

// --- Net Profit Report (PDF Generation) ---
exports.generateNetProfitReport = async (req, res) => {
    const { startDate, endDate } = req.query;
    const action = req.path.includes('/preview') ? 'preview' : 'download';

    try {
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required.' });
        }

        // Set Content-Disposition
        const filename = `Net_Profit_Report_${startDate}_to_${endDate}.pdf`; // Changed filename format slightly
         if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/pdf'); // Ensure Content-Type is set
            if (action === 'download') {
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            } else {
                 res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            }
        } else {
             return;
        }

        // Call the helper function - it handles the response stream internally.
        await generateNetProfitPdf(res, startDate, endDate); // Added await, although helper manages stream

    } catch (error) {
         if (!res.headersSent) {
            res.status(500).json({ message: `Server error generating net profit report (${action}).` });
        } else {
        }
    }
};
