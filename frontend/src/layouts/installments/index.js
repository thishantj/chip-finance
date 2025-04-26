import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getToken } from "utils/auth"; // Updated import path

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiInput from "components/VuiInput";
import VuiButton from "components/VuiButton";
import VuiAlert from "components/VuiAlert"; // Import VuiAlert
import GradientBorder from "examples/GradientBorder";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Grid from "@mui/material/Grid"; // Import Grid
import Table from "examples/Tables/Table"; // Import Table
import Snackbar from '@mui/material/Snackbar'; // Import Snackbar
import Alert from '@mui/material/Alert'; // Import Alert for Snackbar

// Vision UI Dashboard React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

// Vision UI Dashboard React base styles
import colors from "assets/theme/base/colors"; // Import colors
import borders from "assets/theme/base/borders"; // Import borders
import typography from "assets/theme/base/typography"; // Import typography
import { useTheme } from '@mui/material/styles'; // Import useTheme

// Utilities
// import { formatDate, formatCurrency } from "utils/formatters"; // Assuming you have formatters

// Function to format date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// Function to format currency
const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "N/A";
    return parseFloat(amount).toLocaleString("en-LK", {
        style: "currency",
        currency: "LKR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

function Installments() {
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [searchedClients, setSearchedClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [loanSummaries, setLoanSummaries] = useState([]);
  const [upcomingInstallments, setUpcomingInstallments] = useState([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);
  const [error, setError] = useState(""); // General errors
  const [summaryError, setSummaryError] = useState(""); // Errors specific to summary loading
  const [paymentAmounts, setPaymentAmounts] = useState({}); // { installment_id: amount }
  const [paymentErrors, setPaymentErrors] = useState({}); // { installment_id: error_message }
  const [paymentLoading, setPaymentLoading] = useState({}); // { installment_id: boolean }
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success"); // 'success' or 'error'

  const theme = useTheme();
  const { gradients, info, grey, background } = theme.palette;
  const { borderRadius } = theme.borders;
  const { size } = theme.typography;

  // --- Helper Functions ---
  // Remove the local getToken definition
  // const getToken = () => localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  // --- Data Fetching ---
  const fetchLoanSummary = useCallback(async (clientId) => {
    if (!clientId) return;
    setIsLoadingSummary(true);
    setSummaryError("");
    setLoanSummaries([]); // Clear previous summary
    setPaymentAmounts({}); // Clear payment inputs
    setPaymentErrors({}); // Clear payment errors
    try {
      const token = getToken();
      if (!token) throw new Error("Authentication token not found.");
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/clients/${clientId}/loan-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLoanSummaries(response.data.loanSummaries);
    } catch (err) {
      console.error("Error fetching loan summary:", err);
      setSummaryError(err.response?.data?.message || err.message || "Failed to fetch loan summary.");
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  const fetchUpcomingInstallments = useCallback(async () => {
    setIsLoadingUpcoming(true);
    setError(""); // Clear general errors
    try {
      const token = getToken();
      if (!token) throw new Error("Authentication token not found.");
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/installments/upcoming`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUpcomingInstallments(response.data);
    } catch (err) {
      console.error("Error fetching upcoming installments:", err);
      setError(err.response?.data?.message || err.message || "Failed to fetch upcoming installments.");
    } finally {
      setIsLoadingUpcoming(false);
    }
  }, []);

  useEffect(() => {
    fetchUpcomingInstallments();
  }, [fetchUpcomingInstallments]);

  // --- Event Handlers ---
  const handleClientSearch = async (event) => {
    const searchTerm = event.target.value;
    setClientSearchTerm(searchTerm);
    setSelectedClient(null);
    setLoanSummaries([]);
    setSummaryError("");
    setSearchedClients([]);

    if (searchTerm.trim().length < 2) {
      setIsSearchingClients(false);
      return;
    }

    setIsSearchingClients(true);
    try {
      const token = getToken();
      if (!token) throw new Error("Authentication token not found.");
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/clients/search?q=${searchTerm.trim()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchedClients(response.data);
    } catch (err) {
      console.error("Error searching clients:", err);
      setSummaryError(err.response?.data?.message || "Failed to search clients."); // Show error in summary area
      setSearchedClients([]);
    } finally {
      setIsSearchingClients(false);
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setClientSearchTerm(`${client.name} (${client.nic})`);
    setSearchedClients([]);
    fetchLoanSummary(client.client_id); // Fetch summary for the selected client
  };

  const handlePaymentAmountChange = (installmentId, amount) => {
    setPaymentAmounts(prev => ({ ...prev, [installmentId]: amount }));
    // Clear error for this specific input on change
    setPaymentErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[installmentId];
        return newErrors;
    });
  };

  const handleMarkAsPaid = async (installmentId, loanId) => {
    const amount = paymentAmounts[installmentId];
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setPaymentErrors(prev => ({ ...prev, [installmentId]: "Enter a valid amount" }));
      return;
    }

    setPaymentLoading(prev => ({ ...prev, [installmentId]: true }));
    setPaymentErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[installmentId];
        return newErrors;
    }); // Clear previous error

    try {
      const token = getToken();
      if (!token) throw new Error("Authentication token not found.");

      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/installments/${installmentId}/pay`,
        { paidAmount: parseFloat(amount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSnackbarMessage("Payment recorded successfully!");
      setSnackbarSeverity("success");
      setOpenSnackbar(true);

      // Refresh summary and upcoming installments
      if (selectedClient) {
        fetchLoanSummary(selectedClient.client_id);
      }
      fetchUpcomingInstallments();

    } catch (err) {
      console.error("Error marking installment as paid:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to record payment.";
      setPaymentErrors(prev => ({ ...prev, [installmentId]: errorMessage }));
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    } finally {
      setPaymentLoading(prev => ({ ...prev, [installmentId]: false }));
    }
  };

  // --- Table Data ---
  const upcomingColumns = [
    { name: "client", label: "Client (NIC)", align: "left" },
    { name: "loan_id", label: "Loan ID", align: "center" },
    { name: "installment", label: "Installment #", align: "center" },
    { name: "due_date", label: "Due Date", align: "center" },
    { name: "amount_due", label: "Amount Due", align: "right" },
    { name: "status", label: "Status", align: "center" },
  ];

  const upcomingRows = upcomingInstallments.map(inst => ({
    client: (
      <VuiBox display="flex" flexDirection="column">
        <VuiTypography variant="caption" color="white" fontWeight="medium">
          {inst.client_name || "N/A"}
        </VuiTypography>
        <VuiTypography variant="caption" color="text" fontWeight="regular">
          {inst.client_nic || "N/A"}
        </VuiTypography>
      </VuiBox>
    ),
    loan_id: (
      <VuiTypography variant="caption" color="white" fontWeight="medium">
        {inst.loan_id}
      </VuiTypography>
    ),
    installment: (
      <VuiTypography variant="caption" color="white" fontWeight="medium">
        {inst.installment_number}
      </VuiTypography>
    ),
    due_date: (
      <VuiTypography variant="caption" color="white" fontWeight="medium">
        {formatDate(inst.due_date)}
      </VuiTypography>
    ),
    amount_due: (
      <VuiTypography variant="caption" color="white" fontWeight="medium">
        {formatCurrency(inst.amount_due)}
      </VuiTypography>
    ),
    status: (
       <VuiTypography variant="caption" color={inst.status === 'pending' ? "warning" : "error"} fontWeight="medium">
         {inst.status}
       </VuiTypography>
     ),
  }));


  return (
    <DashboardLayout>
      <DashboardNavbar />
      <VuiBox py={3}>
        {/* --- Client Search and Loan Summary Card --- */}
        <Card sx={{ mb: 3 }}>
          <VuiBox p={3}>
            <VuiTypography variant="h5" color="white" fontWeight="medium" mb={3}>
              Client Loan Installment Summary
            </VuiTypography>

            {/* Client Search Input */}
            <VuiBox mb={2} sx={{ position: "relative" }}>
              <VuiBox mb={1} ml={0.5}>
                <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                  Search Client (Name or NIC)
                </VuiTypography>
              </VuiBox>
              <GradientBorder /* ... gradient props ... */ >
                <VuiInput
                  type="text"
                  placeholder="Start typing to search..."
                  value={clientSearchTerm}
                  onChange={handleClientSearch}
                  disabled={!!selectedClient}
                  sx={{ fontSize: size.sm }}
                />
              </GradientBorder>
              {isSearchingClients && (
                <CircularProgress size={20} sx={{ position: "absolute", right: 10, top: 40 }} />
              )}
              {/* Search Results Dropdown */}
              {searchedClients.length > 0 && !selectedClient && (
                <Paper /* ... dropdown styles ... */
                    sx={{
                      position: "absolute", zIndex: 10, width: "100%", maxHeight: 200, overflow: "auto", mt: 1,
                      bgcolor: background.card, border: `1px solid ${grey[700]}`, borderRadius: borderRadius.md, boxShadow: 3,
                    }}
                >
                  <List dense>
                    {searchedClients.map((client) => (
                      <ListItem button key={client.client_id} onClick={() => handleSelectClient(client)} sx={{ "&:hover": { backgroundColor: info.main } }}>
                        <ListItemText
                          primaryTypographyProps={{ color: "white", fontSize: size.sm }}
                          secondaryTypographyProps={{ color: grey[500], fontSize: size.xs }}
                          primary={client.name}
                          secondary={`NIC: ${client.nic || 'N/A'} / Tel: ${client.telephone || 'N/A'}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </VuiBox>

            {/* Selected Client Display & Loan Summaries */}
            {selectedClient && (
              <VuiBox mt={3}>
                <VuiBox display="flex" justifyContent="space-between" alignItems="center" mb={2} p={1.5} sx={{ border: `1px solid ${grey[700]}`, borderRadius: borderRadius.md, backgroundColor: background.default }}>
                   <VuiBox>
                     <VuiTypography variant="h6" color="white" fontWeight="medium">
                       Selected: {selectedClient.name}
                     </VuiTypography>
                     <VuiTypography variant="caption" color="text" ml={1}>
                       (NIC: {selectedClient.nic}, Tel: {selectedClient.telephone})
                     </VuiTypography>
                   </VuiBox>
                   <VuiButton size="small" color="error" variant="text" onClick={() => { setSelectedClient(null); setClientSearchTerm(""); setLoanSummaries([]); setSummaryError(""); }}>
                     Clear
                   </VuiButton>
                 </VuiBox>


                {isLoadingSummary && <CircularProgress color="inherit" size={30} sx={{ display: 'block', margin: '20px auto' }} />}
                {summaryError && (
                  <VuiAlert color="error" dismissible sx={{ mb: 2 }} onClose={() => setSummaryError("")}>
                    <VuiTypography variant="caption" color="white">{summaryError}</VuiTypography>
                  </VuiAlert>
                )}

                {!isLoadingSummary && loanSummaries.length === 0 && !summaryError && (
                  <VuiTypography variant="body2" color="text" textAlign="center" mt={2}>
                    No active loans found for this client.
                  </VuiTypography>
                )}

                {loanSummaries.map((summary) => (
                  <Card key={summary.loan_id} sx={{ mb: 2, p: 2, backgroundColor: "rgba(255, 255, 255, 0.05)" }}>
                    <VuiTypography variant="h6" color="info" fontWeight="medium" mb={1}>
                      Loan ID: {summary.loan_id}
                    </VuiTypography>
                    <Grid container spacing={1} mb={1}>
                      <Grid item xs={6} sm={3}><VuiTypography variant="caption" color="text">Total Due:</VuiTypography></Grid>
                      <Grid item xs={6} sm={9}><VuiTypography variant="caption" color="white">{formatCurrency(summary.total_amount_due)}</VuiTypography></Grid>

                      {/* Add Remaining Balance Display */}
                      <Grid item xs={6} sm={3}><VuiTypography variant="caption" color="text">Remaining Balance:</VuiTypography></Grid>
                      <Grid item xs={6} sm={9}><VuiTypography variant="caption" color="white" fontWeight="bold">{formatCurrency(summary.remaining_balance)}</VuiTypography></Grid>

                      <Grid item xs={6} sm={3}><VuiTypography variant="caption" color="text">Paid / Remaining:</VuiTypography></Grid>
                      <Grid item xs={6} sm={9}><VuiTypography variant="caption" color="white">{summary.installments_paid} / {summary.installments_remaining}</VuiTypography></Grid>

                      <Grid item xs={6} sm={3}><VuiTypography variant="caption" color="text">Next Due Date:</VuiTypography></Grid>
                      <Grid item xs={6} sm={9}><VuiTypography variant="caption" color="white">{summary.next_payment_date ? formatDate(summary.next_payment_date) : "N/A (Fully Paid)"}</VuiTypography></Grid>

                      <Grid item xs={6} sm={3}><VuiTypography variant="caption" color="text">Next Amount:</VuiTypography></Grid>
                      <Grid item xs={6} sm={9}><VuiTypography variant="caption" color="white">{summary.next_installment_amount ? formatCurrency(summary.next_installment_amount) : "N/A"}</VuiTypography></Grid>
                    </Grid>

                    {/* Payment Input and Button */}
                    {summary.next_installment_id && (
                      <VuiBox mt={2}>
                        <Grid container spacing={1} alignItems="center">
                          <Grid item xs={12} sm={6}>
                             <VuiBox mb={paymentErrors[summary.next_installment_id] ? 0.5 : 0}>
                                <GradientBorder /* ... gradient props ... */ >
                                  <VuiInput
                                    type="number"
                                    placeholder={`Enter amount paid (>= ${formatCurrency(summary.next_installment_amount)})`}
                                    value={paymentAmounts[summary.next_installment_id] || ""}
                                    onChange={(e) => handlePaymentAmountChange(summary.next_installment_id, e.target.value)}
                                    disabled={paymentLoading[summary.next_installment_id]}
                                    error={!!paymentErrors[summary.next_installment_id]}
                                    sx={{ fontSize: size.sm }}
                                    step="0.01"
                                  />
                                </GradientBorder>
                                {paymentErrors[summary.next_installment_id] && (
                                    <VuiTypography variant="caption" color="error" sx={{ display: 'block', ml: 0.5, mt: 0.5 }}>
                                        {paymentErrors[summary.next_installment_id]}
                                    </VuiTypography>
                                )}
                             </VuiBox>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <VuiButton
                              color="success"
                              variant="contained"
                              size="small"
                              onClick={() => handleMarkAsPaid(summary.next_installment_id, summary.loan_id)}
                              disabled={!paymentAmounts[summary.next_installment_id] || paymentLoading[summary.next_installment_id]}
                              fullWidth
                            >
                              {paymentLoading[summary.next_installment_id] ? <CircularProgress size={18} color="inherit" /> : "Mark Next as Paid"}
                            </VuiButton>
                          </Grid>
                        </Grid>
                      </VuiBox>
                    )}
                  </Card>
                ))}
              </VuiBox>
            )}
          </VuiBox>
        </Card>

        {/* --- Upcoming Installments Table --- */}
        <Card>
          <VuiBox display="flex" justifyContent="space-between" alignItems="center" mb="22px" px={2} pt={2}>
            <VuiTypography variant="lg" color="white">
              Upcoming Installments (All Clients)
            </VuiTypography>
            {/* Add Filters/Search for this table later if needed */}
          </VuiBox>

          {error && ( // Display general errors for this table
            <VuiBox mb={2} px={2}>
              <VuiAlert color="error" dismissible onClose={() => setError("")}>
                <VuiTypography variant="caption" color="white">{error}</VuiTypography>
              </VuiAlert>
            </VuiBox>
          )}

          {isLoadingUpcoming ? (
            <VuiBox p={3} textAlign="center">
              <CircularProgress color="inherit" size={40} />
              <VuiTypography variant="h6" color="text" mt={2}>Loading upcoming installments...</VuiTypography>
            </VuiBox>
          ) : !error && upcomingRows.length === 0 ? (
            <VuiBox p={3} textAlign="center">
              <VuiTypography variant="h6" color="text">No upcoming installments found.</VuiTypography>
            </VuiBox>
          ) : (
            // --- Scrollable Table Container ---
            <VuiBox
              sx={{
                maxHeight: "500px", // Set a max height (adjust as needed)
                overflowY: "auto", // Enable vertical scrolling
                "& th": {
                  borderBottom: ({ borders: { borderWidth }, palette: { grey } }) =>
                    `${borderWidth[1]} solid ${grey[700]}`,
                  position: "sticky", // Make header sticky
                  top: 0, // Stick to the top
                  backgroundColor: background.card, // Match card background
                  zIndex: 2, // Ensure header is above scrolling content
                },
                "& .MuiTableRow-root:not(:last-child)": {
                  "& td": {
                    borderBottom: ({ borders: { borderWidth }, palette: { grey } }) =>
                      `${borderWidth[1]} solid ${grey[700]}`,
                  },
                },
                 // Optional: Style scrollbar for better visibility in dark mode
                 '&::-webkit-scrollbar': {
                    width: '8px',
                 },
                 '&::-webkit-scrollbar-track': {
                    backgroundColor: grey[800], // Dark track
                 },
                 '&::-webkit-scrollbar-thumb': {
                    backgroundColor: grey[600], // Lighter thumb
                    borderRadius: '4px',
                 },
                 '&::-webkit-scrollbar-thumb:hover': {
                    backgroundColor: grey[500], // Lighter thumb on hover
                 }
              }}
            >
              <Table columns={upcomingColumns} rows={upcomingRows} />
            </VuiBox>
            // --- End Scrollable Table Container ---
          )}
        </Card>
      </VuiBox>

      {/* Snackbar for Success/Error Messages */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%', backgroundColor: `${snackbarSeverity}.main` }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

export default Installments;

// Helper function (can be moved to utils/formatters.js)
// const formatDate = (dateString) => {
//   if (!dateString) return "N/A";
//   const options = { year: "numeric", month: "short", day: "numeric" };
//   return new Date(dateString).toLocaleDateString(undefined, options);
// };

// const formatCurrency = (amount) => {
//     if (amount === null || amount === undefined || isNaN(amount)) return "N/A";
//     return parseFloat(amount).toLocaleString("en-LK", {
//         style: "currency",
//         currency: "LKR",
//         minimumFractionDigits: 2,
//         maximumFractionDigits: 2,
//     });
// };
