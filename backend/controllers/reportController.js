const Client = require('../models/Client');
const Loan = require('../models/Loan');
const Installment = require('../models/Installment');
const PaymentHistory = require('../models/PaymentHistory'); // Corrected model name
const PDFDocument = require('pdfkit'); // Import pdfkit
const { formatDate } = require('../utils/dateFormatter'); // Assuming you have a date formatter utility

// --- Helper Function (Using pdfkit) ---
// This function now directly pipes the PDF to the response stream
const generateClientSummaryPdf = async (res, client, startDate, endDate) => {
    console.log(`[PDF Helper] Generating Client Summary PDF for: ${client.name}`); // Added log
    const doc = new PDFDocument({ margin: 50 });

    // --- Stream Error Handling ---
    let errorOccurred = false;
    let streamClosedPrematurely = false; // Flag for premature close

    doc.on('error', (err) => {
        console.error('[PDF Helper] PDFDocument stream error (Client Summary):', err);
        errorOccurred = true;
        if (!res.headersSent) {
            res.status(500).json({ message: 'Error generating PDF document stream.' });
        } else if (!res.writableEnded) { // Check if response is still writable before ending
             res.end(); // Attempt to end response if possible
        }
    });
    res.on('error', (err) => {
        console.error('[PDF Helper] Response stream error (Client Summary):', err);
        errorOccurred = true;
        // Cannot send new status/headers if response stream errors out
        // doc might become unwritable here
        if (doc.writable) {
            doc.destroy(); // Destroy the source stream if response errors
        }
    });
     res.on('close', () => {
        // This event fires when the connection is terminated, regardless of whether 'finish' fired.
        if (!res.writableEnded) { // Check if response finished normally
             console.warn(`[PDF Helper] WARNING: Response stream closed prematurely (Client Summary ID: ${client.client_id}).`);
             streamClosedPrematurely = true;
             // If the response closes, the doc stream might become unwritable or error out
             if (doc.writable) {
                 doc.destroy(); // Destroy the source stream
             }
        } else {
             console.log(`[PDF Helper] Response stream closed normally (Client Summary ID: ${client.client_id}).`);
        }
    });
    doc.on('finish', () => {
        console.log(`[PDF Helper] PDFDocument stream finished writing (Client Summary ID: ${client.client_id}).`);
        // This indicates doc.end() completed successfully. res should close shortly after.
    });
    // --- End Stream Error Handling ---

    // Set headers only if not already sent
    if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/pdf');
    } else {
        console.warn(`[PDF Helper] Headers already sent before setting Content-Type (Client Summary ID: ${client.client_id}).`);
        return; // Cannot proceed
    }

    // Pipe the PDF document directly to the response stream
    console.log(`[PDF Helper] Piping PDF document to response (Client Summary ID: ${client.client_id})...`);
    doc.pipe(res);

    // --- PDF Content ---
    try {
        console.log(`[PDF Helper] Adding content to Client Summary PDF (Client ID: ${client.client_id})...`);
        // Header
        doc.fontSize(18).text(`Client Summary: ${client.name}`, { align: 'center' });
        doc.fontSize(12).text(`Report Period: ${startDate} to ${endDate}`, { align: 'center' });
        doc.moveDown(2);

        // Client Details
        doc.fontSize(14).text('Client Details', { underline: true });
        doc.fontSize(10).text(`Client ID: ${client.client_id}`);
        doc.text(`NIC: ${client.nic || 'N/A'}`);
        doc.text(`Address: ${client.address || 'N/A'}`);
        doc.text(`Telephone: ${client.telephone || 'N/A'}`);
        doc.moveDown();

        // Fetch Summary Data (using the same logic as getClientSummary endpoint)
        console.log(`[PDF Helper] Fetching summary data for Client ID: ${client.client_id}...`);
        const totalRemainingBalance = parseFloat(await Loan.getTotalRemainingBalanceByClient(client.client_id) || 0);
        const totalDueActiveLoans = parseFloat(await Loan.getTotalDueForActiveLoansByClient(client.client_id) || 0);
        const totalPaidInRange = parseFloat(await PaymentHistory.getTotalPaidByClientInRange(client.client_id, startDate, endDate) || 0);
        console.log(`[PDF Helper] Fetched summary data for Client ID: ${client.client_id}.`);

        // Overall Summary Section
        doc.fontSize(14).text('Overall Summary', { underline: true });
        doc.fontSize(10).text(`Total Remaining Balance (All Loans): LKR ${totalRemainingBalance.toFixed(2)}`);
        doc.text(`Total Due (Active Loans): LKR ${totalDueActiveLoans.toFixed(2)}`);
        doc.text(`Total Paid (Within ${startDate} to ${endDate}): LKR ${totalPaidInRange.toFixed(2)}`);
        doc.moveDown();

        // Fetch Loan Details (Example - you might want more details)
        console.log(`[PDF Helper] Fetching loan details for Client ID: ${client.client_id}...`);
        const loans = await Loan.findByClientIdWithDetails(client.client_id);
        console.log(`[PDF Helper] Fetched ${loans?.length || 0} loans for Client ID: ${client.client_id}.`);
        doc.fontSize(14).text('Loan Details', { underline: true });
        if (loans && loans.length > 0) {
            loans.forEach(loan => {
                const loanAmount = parseFloat(loan.loan_amount || 0);
                const totalAmountDue = parseFloat(loan.total_amount_due || 0);
                const remainingBalance = parseFloat(loan.remaining_balance || 0);

                doc.fontSize(12).text(`Loan ID: ${loan.loan_id} (${loan.status})`, { continued: true, underline: false });
                doc.fontSize(10).text(` - Amount: LKR ${loanAmount.toFixed(2)}`, { continued: false, underline: false });
                doc.text(`   Total Due: LKR ${totalAmountDue.toFixed(2)}`);
                doc.text(`   Remaining: LKR ${remainingBalance.toFixed(2)}`);
                doc.text(`   Issued: ${formatDate(loan.created_at)}`);
                doc.text(`   Next Payment: ${formatDate(loan.next_payment_date) || 'N/A'}`);
                doc.moveDown(0.5);
            });
        } else {
            doc.fontSize(10).text('No loans found for this client.');
        }
        doc.moveDown();
        console.log(`[PDF Helper] Finished adding content to Client Summary PDF (Client ID: ${client.client_id}).`);

        // Placeholder for Payment History in Range (Add if needed)
        // doc.fontSize(14).text('Payments in Range', { underline: true });
        // Fetch and display payments...

        console.log(`[PDF Helper] Calling doc.end() (Client Summary ID: ${client.client_id})...`);
        doc.end();

    } catch (dataError) {
        console.error(`[PDF Helper] Error during Client Summary PDF generation (Client ID: ${client.client_id}): ${dataError}`);
        errorOccurred = true; // Mark error occurred
        if (!res.headersSent) {
            // If headers not sent, send a JSON error
             try {
                res.status(500).json({ message: `Error generating client summary PDF: ${dataError.message}` });
             } catch (e) { console.error("Error sending JSON error response:", e); }
        } else if (doc.writable) {
            // If headers sent and doc writable, try adding error to PDF
            try {
                doc.fontSize(10).fillColor('red').text(`\n\nINTERNAL SERVER ERROR: Failed to generate complete report. Details: ${dataError.message}`);
                doc.end();
            } catch (e) { console.error("Error adding error text to PDF:", e); }
        }
        // If headers sent and doc not writable, we can't do much more than log
    }
};

// --- Basic PDF Helper for Net Profit ---
// Make the function async for better practice with streams, although not strictly required by current content
const generateNetProfitPdf = async (res, startDate, endDate) => {
    console.log(`[PDF Helper] Generating Net Profit PDF`);
    const doc = new PDFDocument({ margin: 50 });
    let errorOccurred = false; // Keep track of errors
    let streamClosedPrematurely = false;

    // --- Stream Event Handlers ---
    doc.on('finish', () => {
        console.log('[PDF Helper] PDFDocument stream finished writing (Net Profit).');
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
            console.warn('[PDF Helper] Ending response due to doc stream error after headers sent.');
            res.end();
        }
    });
    res.on('error', (err) => {
        console.error('[PDF Helper] Response stream error (Net Profit):', err);
        errorOccurred = true;
        // If response errors, destroy the source doc stream if it's still active
        if (doc.writable) {
            console.warn('[PDF Helper] Destroying doc stream due to response stream error.');
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
                console.warn('[PDF Helper] Destroying doc stream due to premature response close.');
                doc.destroy();
            }
        } else {
            console.log('[PDF Helper] Response stream closed normally (Net Profit).');
        }
    });
    // --- End Stream Event Handlers ---

    // Set Headers only if not already sent
    if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/pdf');
    } else {
        console.warn('[PDF Helper] Headers already sent before setting Content-Type (Net Profit).');
        // If headers are already sent, we probably can't recover. Log and return.
        return;
    }

    // Pipe the document to the response
    console.log('[PDF Helper] Piping PDF document to response (Net Profit)...');
    doc.pipe(res);

    // Add Content and Finalize the PDF Document
    try {
        console.log('[PDF Helper] Adding content to Net Profit PDF...');
        // --- Add content ---
        doc.fontSize(18).text('Net Profit Report', { align: 'center' });
        doc.fontSize(12).text(`Report Period: ${startDate} to ${endDate}`, { align: 'center' });
        doc.moveDown(2);

        // Placeholder content - Replace with actual data fetching and calculation
        doc.fontSize(14).text('Summary (Placeholder)', { underline: true });
        doc.fontSize(10).text('Total Income (Example): LKR 50000.00');
        doc.text('Total Expenses (Example): LKR 20000.00');
        doc.moveDown(0.5);
        doc.fontSize(12).text('Net Profit (Example): LKR 30000.00');
        doc.moveDown(2);
        doc.fontSize(8).text('[Detailed net profit calculation data would go here]', { align: 'center' });
        console.log('[PDF Helper] Finished adding content to Net Profit PDF.');

        // --- Finalize the PDF ---
        // Call end() inside the try block after successfully adding content.
        console.log('[PDF Helper] Calling doc.end() (Net Profit)...');
        doc.end();

    } catch (contentError) {
        console.error(`[PDF Helper] Error adding content or ending Net Profit PDF: ${contentError}`);
        errorOccurred = true;
        // If an error occurs while adding content, try to add error text to the PDF
        // ONLY if the doc stream is still writable. This might happen if contentError is thrown
        // before doc.end() is called but after piping started.
        try {
            if (doc.writable) {
                console.warn('[PDF Helper] Attempting to add error message to PDF...');
                doc.fontSize(10).fillColor('red').text(`\n\nINTERNAL SERVER ERROR: Failed to generate report content. Details: ${contentError.message}`);
                doc.end(); // Try to end the doc after adding error message
            } else {
                 console.warn('[PDF Helper] Doc stream not writable when trying to add content error message.');
                 // If doc is not writable, attempt to end the response if possible and not already ended
                 if (!res.writableEnded) {
                     console.warn('[PDF Helper] Attempting to end response stream after content error.');
                     res.end();
                 }
            }
        } catch (e) {
            console.error('[PDF Helper] Error while trying to add error message to PDF or end response:', e);
             // Final attempt to end response if something went wrong and it's not ended
             if (!res.writableEnded) {
                 res.end();
             }
        }

        // If headers haven't been sent yet (very unlikely here), send JSON error
        if (!res.headersSent) {
             try { res.status(500).json({ message: `Error generating PDF content: ${contentError.message}` }); } catch (e) { console.error("Error sending JSON error response:", e); }
        }
    }
    // Removed the finally block that was causing issues by checking doc.writable prematurely.
    // Stream events ('finish', 'error', 'close') will handle the final state.
};


// --- Client Summary Report (PDF Generation) ---
exports.generateClientSummaryReport = async (req, res) => {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;
    const action = req.path.includes('/preview') ? 'preview' : 'download';

    console.log(`[Controller] Generating Client Summary Report (${action}) for Client ID: ${clientId}, Dates: ${startDate} to ${endDate}`); // Added log

    try {
        if (!clientId || !startDate || !endDate) {
            return res.status(400).json({ message: 'Client ID, start date, and end date are required.' });
        }
        const client = await Client.findById(clientId);
        if (!client) {
            console.log(`[Controller] Client not found for ID: ${clientId} during report generation`); // Added log
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
             console.error(`[Controller] Headers already sent before setting Content-Disposition for client ${clientId}`);
             return; // Stop processing if headers are already sent
        }

        // Call the helper function to generate and stream the PDF
        generateClientSummaryPdf(res, client, startDate, endDate); // Changed from await
        // No need to call res.send() or res.status() here, as the helper pipes the response

    } catch (error) {
        // Ensure headers are not already sent before sending error response
        if (!res.headersSent) {
            console.error(`[Controller] Error generating client summary report (${action}) for client ${clientId}:`, error); // Added log
            res.status(500).json({ message: `Server error generating client summary report (${action}).` });
        } else {
            console.error(`[Controller] Error after headers sent for client summary report (${action}), client ${clientId}:`, error);
            // If headers are sent, we can't send a JSON error, but we should log it.
            // The stream might have already been partially sent or closed.
        }
    }
};

// --- Net Profit Report (PDF Generation) ---
exports.generateNetProfitReport = async (req, res) => {
    const { startDate, endDate } = req.query;
    const action = req.path.includes('/preview') ? 'preview' : 'download';

    console.log(`[Controller] Generating Net Profit Report (${action}) for Dates: ${startDate} to ${endDate}`); // Added log

    try {
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required.' });
        }

        // Set Content-Disposition
        const filename = `net_profit_report_${startDate}_to_${endDate}.pdf`;
         if (!res.headersSent) {
            if (action === 'download') {
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            } else {
                 res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            }
        } else {
             console.error(`[Controller] Headers already sent before setting Content-Disposition for net profit report`);
             return;
        }

        // Call the helper function - no await needed here, it handles the response stream internally.
        generateNetProfitPdf(res, startDate, endDate);

    } catch (error) {
         // This catch block handles errors from the initial checks (date validation)
         // or potentially errors thrown synchronously *before* generateNetProfitPdf starts piping.
         if (!res.headersSent) {
            console.error(`[Controller] Error generating net profit report (${action}):`, error); // Added log
            res.status(500).json({ message: `Server error generating net profit report (${action}).` });
        } else {
             console.error(`[Controller] Error after headers sent for net profit report (${action}):`, error);
        }
    }
};
