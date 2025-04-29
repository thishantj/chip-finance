import React, { useState, useEffect, useCallback } from "react";
import Card from "@mui/material/Card";
// Restore Grid, DatePicker, TextField, LocalizationProvider, AdapterDateFns, date-fns imports
import Grid from "@mui/material/Grid";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import { startOfMonth, endOfDay, format, parseISO, isWithinInterval } from "date-fns"; // Import date functions

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiAlert from "components/VuiAlert";

// React icons (adjust as needed)
import { FaFileInvoiceDollar, FaMoneyBillWave } from "react-icons/fa"; // Icons for loan/payment

// Vision UI Dashboard React example components
import TimelineItem from "examples/Timeline/TimelineItem";

// Vision UI Dashboard theme imports
import palette from "assets/theme/base/colors";
import borders from "assets/theme/base/borders";
import typography from "assets/theme/base/typography";
import { useTheme } from "@mui/material/styles";

// Utilities
import { getToken } from "utils/auth";
import axiosInstance from "api/axiosInstance";
import { formatCurrency, formatDate } from "utils/formatters"; // Ensure formatters are available

// --- Restore Original Component Name ---
function LatestTransactions() {
  const [transactions, setTransactions] = useState([]); // Renamed back from items
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Restore startDate and endDate state
  const [startDate, setStartDate] = useState(() => startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(() => endOfDay(new Date())); // Use endOfDay for inclusivity

  const theme = useTheme();
  const { borderRadius } = theme.borders;
  const { size } = theme.typography;
  // Destructure 'info' from palette
  const { grey, background, white, inputColors, text, info } = theme.palette; // Added 'info'

  const fetchTransactions = useCallback(async () => { // Renamed back from fetchItems
    // Restore date validation
    if (!startDate || !endDate || startDate > endDate) {
        setError("Invalid date range selected.");
        setTransactions([]); // Clear transactions on invalid range
        setLoading(false);
        return;
    }

    setLoading(true);
    setError(null);
    const token = getToken();
    if (!token) {
      setError("Authentication required.");
      setLoading(false);
      return;
    }

    // Format dates for comparison
    const interval = { start: startDate, end: endDate };

    try {
      // --- Fetch Loans and Paid Installments ---
      // 1. Fetch all loans
      const loansResponse = await axiosInstance.get("/api/loans", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allLoans = loansResponse.data || [];

      // 2. Filter loans issued within the date range
      const issuedLoans = allLoans
        .filter(loan => {
            try {
                const createdAt = parseISO(loan.created_at); // Parse ISO string
                return isWithinInterval(createdAt, interval);
            } catch (e) {
                console.error("Error parsing loan created_at date:", loan.created_at, e);
                return false;
            }
        })
        .map(loan => ({
          id: `loan-${loan.loan_id}`,
          type: "loan",
          date: parseISO(loan.created_at), // Keep as Date object for sorting
          amount: loan.principal_amount, // Use principal amount for issued loan
          client_name: loan.client_name,
          client_nic: loan.client_nic,
          loan_id: loan.loan_id,
        }));

      // 3. Fetch paid installments for all loans (inefficient, but necessary without backend changes)
      const installmentPromises = allLoans.map(loan =>
        axiosInstance.get(`/api/installments/loan/${loan.loan_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => ({ // Attach client info to installments
            loan,
            installments: res.data || []
        }))
        .catch(err => {
            console.error(`Failed to fetch installments for loan ${loan.loan_id}`, err);
            return { loan, installments: [] }; // Return empty on error for this loan
        })
      );

      const installmentResults = await Promise.all(installmentPromises);

      // 4. Filter paid installments within the date range
      const paidInstallments = installmentResults.flatMap(({ loan, installments }) =>
        installments
          .filter(inst => {
              if (inst.status === 'paid' && inst.payment_date) {
                  try {
                      const paymentDate = parseISO(inst.payment_date); // Parse ISO string
                      return isWithinInterval(paymentDate, interval);
                  } catch (e) {
                      console.error("Error parsing installment payment_date:", inst.payment_date, e);
                      return false;
                  }
              }
              return false;
          })
          .map(inst => ({
            id: `inst-${inst.installment_id}`,
            type: "payment",
            date: parseISO(inst.payment_date), // Keep as Date object for sorting
            amount: inst.paid_amount, // Use paid amount
            client_name: loan.client_name, // Add client name from parent loan
            client_nic: loan.client_nic,   // Add client NIC from parent loan
            loan_id: inst.loan_id,
            installment_id: inst.installment_id,
          }))
      );

      // 5. Combine and sort transactions by date (descending)
      const combinedTransactions = [...issuedLoans, ...paidInstallments].sort(
        (a, b) => b.date - a.date
      );

      setTransactions(combinedTransactions);
      // --- End Fetching Logic ---

    } catch (err) {
      console.error("Error fetching transactions:", err); // Updated error message
      let errorMsg = "Failed to load transactions."; // Updated error message
      if (err.response) {
          errorMsg = err.response.data?.message || `Error ${err.response.status}: Failed to fetch data.`;
      } else if (err.request) {
          errorMsg = "Network error: Could not fetch data.";
      } else {
          errorMsg = err.message || "An unexpected error occurred.";
      }
      setError(errorMsg);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]); // Restore date dependencies

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Restore consistent styling for DatePicker TextField
  const inputFieldStyles = {
    "& .MuiInputBase-root": {
      borderColor: inputColors.borderColor + " !important",
      backgroundColor: background.card + " !important", // Match VuiInput background
      color: text.main + " !important", // Match VuiInput text color
      "& input": {
        color: text.main + " !important", // Ensure input text color
        fontSize: size.sm, // Match VuiInput font size
        padding: "10px 14px", // Match VuiInput padding
      },
      "& fieldset": {
        borderColor: inputColors.borderColor + " !important",
      },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: inputColors.borderColor + " !important",
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: info.main + " !important", // Use theme's info color for focus
      },
    },
    "& .MuiSvgIcon-root": { // Style the calendar icon
      color: text.secondary + " !important",
    },
    "& label": { // Style the label
      color: text.secondary + " !important",
      fontSize: size.sm,
      "&.Mui-focused": {
        color: info.main + " !important", // Use theme's info color for focus
      },
    },
  };


  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <VuiBox mb="16px" p={2} pb={0}>
        <VuiTypography variant="lg" fontWeight="bold" color="white">
          Latest Transactions {/* Restore Title */}
        </VuiTypography>
        {/* Restore Date Pickers */}
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={2} mt={1}>
              {/* Start Date Picker */}
              <Grid item xs={12}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue ? startOfMonth(newValue) : null)} // Adjust logic if needed
                  maxDate={endDate || undefined} // Prevent start date being after end date
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      size="small"
                      fullWidth
                      sx={inputFieldStyles}
                    />
                  )}
                />
              </Grid>
              {/* End Date Picker */}
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue ? endOfDay(newValue) : null)} // Adjust logic if needed
                  minDate={startDate || undefined} // Prevent end date being before start date
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      size="small"
                      fullWidth
                      sx={inputFieldStyles}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
      </VuiBox>
      {/* Transaction List */}
      <VuiBox
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          maxHeight: "400px", // Keep max height
          p: 2,
          pt: 0,
          // ... scrollbar styles ...
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': { backgroundColor: grey[800] },
          '&::-webkit-scrollbar-thumb': { backgroundColor: grey[600], borderRadius: borderRadius.md },
          '&::-webkit-scrollbar-thumb:hover': { backgroundColor: grey[500] }
        }}
      >
        {loading ? (
          <VuiBox display="flex" justifyContent="center" alignItems="center" height="100%" minHeight="100px">
            <CircularProgress color="inherit" size={30} />
          </VuiBox>
        ) : error ? (
          <VuiAlert color="error" sx={{ mt: 2 }}>
            <VuiTypography variant="caption" color="white">
              {error}
            </VuiTypography>
          </VuiAlert>
        ) : transactions.length === 0 ? ( // Check transactions array
          <VuiTypography variant="body2" color="text" textAlign="center" mt={2}>
            No transactions found for the selected period. {/* Updated message */}
          </VuiTypography>
        ) : (
          transactions.map((transaction, index) => { // Use transaction
            // --- Adjust Data Mapping for Loans and Payments ---
            const isLoan = transaction.type === "loan";
            const icon = isLoan ? (
              <FaFileInvoiceDollar size="16px" color={palette.error.main} /> // Red icon for loans
            ) : (
              <FaMoneyBillWave size="16px" color={palette.success.main} /> // Green icon for payments
            );
            const title = `${isLoan ? "Loan Issued" : "Payment Received"} (${
              transaction.client_name || "N/A"
            })`;
            // Format amount and determine color
            const amountText = `${isLoan ? "-" : "+"} ${formatCurrency(transaction.amount)}`;
            const amountColor = isLoan ? "error" : "success"; // Use theme color keys

            return (
              <TimelineItem
                key={transaction.id || index} // Use unique ID
                icon={icon}
                title={title}
                dateTime={`${formatDate(transaction.date)} - Loan ID: ${ // Use transaction date
                  transaction.loan_id || "N/A"
                }`}
                customContent={
                  <VuiTypography
                    variant="button"
                    color={amountColor} // Apply color directly
                    fontWeight="bold"
                    sx={{ textAlign: "right", whiteSpace: 'nowrap' }} // Prevent wrapping
                  >
                    {amountText}
                  </VuiTypography>
                }
                lastItem={index === transactions.length - 1} // Check transactions array length
              />
            );
            // --- End Data Mapping Adjustment ---
          })
        )}
      </VuiBox>
    </Card>
  );
}

// --- Restore Export Name ---
export default LatestTransactions;
