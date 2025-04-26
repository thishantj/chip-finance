import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useTheme } from "@mui/material/styles"; // Import useTheme

// @mui material components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton"; // Import IconButton
import Table from "examples/Tables/Table";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Grid from "@mui/material/Grid"; // Import Grid
import Snackbar from "@mui/material/Snackbar"; // Import Snackbar
import Alert from "@mui/material/Alert"; // Import Alert
import Select from "@mui/material/Select"; // Import Select
import MenuItem from "@mui/material/MenuItem"; // Import MenuItem
import FormControl from "@mui/material/FormControl"; // Import FormControl
import InputLabel from "@mui/material/InputLabel";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiInput from "components/VuiInput";
import VuiButton from "components/VuiButton"; // Ensure VuiButton is imported if needed elsewhere
import VuiAlert from "components/VuiAlert"; // Ensure VuiAlert is imported

// Vision UI Dashboard React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

// Vision UI Dashboard React base styles
import colors from "assets/theme/base/colors";
import borders from "assets/theme/base/borders";
import typography from "assets/theme/base/typography"; // Import typography

// Layout specific components
import GradientBorder from "examples/GradientBorder";

// Vision UI Dashboard assets
import radialGradient from "assets/theme/functions/radialGradient";
import palette from "assets/theme/base/colors"; // Use palette directly

// Data
// import authorsTableData from "layouts/tables/data/authorsTableData"; // Remove if not used
// import projectsTableData from "layouts/tables/data/projectsTableData"; // Remove if not used

// Function to format date (assuming it's needed for the table)
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


function Loans() {
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState("");
  const [addError, setAddError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loanSearchTerm, setLoanSearchTerm] = useState(""); // For searching within the loans table
  const [clientSearchTerm, setClientSearchTerm] = useState(""); // For searching clients to add a loan
  const [searchedClients, setSearchedClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [isLoadingLoans, setIsLoadingLoans] = useState(true);
  const [openSnackbar, setOpenSnackbar] = useState(false); // State for Snackbar

  // Form State
  const [principal, setPrincipal] = useState("");
  // const [loanTermDays, setLoanTermDays] = useState(""); // Replaced by calculatedTermInDays
  const [loanTermValue, setLoanTermValue] = useState(""); // Value entered by user
  const [loanTermUnit, setLoanTermUnit] = useState("Days"); // Unit selected (Days, Weeks, Months)
  const [installmentFrequencyDays, setInstallmentFrequencyDays] = useState("");
  const [interestRate, setInterestRate] = useState("24.8");
  const [calculatedTotalDue, setCalculatedTotalDue] = useState(0);
  const [calculatedInstallmentAmount, setCalculatedInstallmentAmount] = useState(0);
  const [manualInstallmentAmount, setManualInstallmentAmount] = useState("");
  const [numberOfInstallments, setNumberOfInstallments] = useState(0);
  const [calculatedTermInDays, setCalculatedTermInDays] = useState(0); // Store term converted to days
  const [lastEditedField, setLastEditedField] = useState(null); // Track last edited field

  const theme = useTheme(); // Get theme object
  const { palette, borders, typography } = theme; // Destructure theme properties
  const { gradients, info, grey, background } = palette; // Destructure from palette
  const { borderRadius } = borders; // Destructure from borders
  const { size } = typography; // Destructure from typography

  // --- Helper Functions ---
  const getToken = () => {
    return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  };

  const handleCloseSnackbar = (event, reason) => {
      if (reason === 'clickaway') {
          return;
      }
      setOpenSnackbar(false);
  };

  // --- Input Change Handlers (to clear errors and track focus) ---
  const handlePrincipalChange = (e) => {
    setPrincipal(e.target.value);
    clearCalculationError();
    setLastEditedField("principal");
  };

  const handleInterestRateChange = (e) => {
    setInterestRate(e.target.value);
    clearCalculationError();
    setLastEditedField("interestRate");
  };

  const handleLoanTermValueChange = (e) => {
    setLoanTermValue(e.target.value);
    clearCalculationError();
    setLastEditedField("loanTermValue");
  };

   const handleLoanTermUnitChange = (e) => {
    setLoanTermUnit(e.target.value);
    clearCalculationError();
    setLastEditedField("loanTermUnit");
  };

  const handleFrequencyChange = (e) => {
    setInstallmentFrequencyDays(e.target.value);
    clearCalculationError();
    setLastEditedField("installmentFrequencyDays");
  };

  const handleManualInstallmentChange = (e) => {
    setManualInstallmentAmount(e.target.value);
    // Don't clear error here, let the calculation useEffect handle it
    setLastEditedField("manualInstallment");
  };

  // --- Helper to clear calculation-specific errors ---
  const clearCalculationError = () => {
      // Only clear the specific negative interest error, leave others
      if (addError === "Manual installment amount is too low, resulting in negative interest.") {
          setAddError("");
      }
  };

  // --- Data Fetching ---
  const fetchLoans = useCallback(async () => {
    setIsLoadingLoans(true);
    setError("");
    try {
      const token = getToken();
      if (!token) {
        setError("Authentication token not found.");
        setIsLoadingLoans(false);
        return;
      }
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/loans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLoans(response.data);
    } catch (err) {
      console.error("Error fetching loans:", err);
      setError(err.response?.data?.message || "Failed to fetch loans.");
    } finally {
      setIsLoadingLoans(false);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  // --- Calculations ---

  // Calculate Term in Days whenever value or unit changes
  useEffect(() => {
    const termVal = parseInt(loanTermValue, 10);
    if (isNaN(termVal) || termVal <= 0) {
      setCalculatedTermInDays(0);
      return;
    }

    let days = 0;
    if (loanTermUnit === 'Days') {
      days = termVal;
    } else if (loanTermUnit === 'Weeks') {
      days = termVal * 7;
    } else if (loanTermUnit === 'Months') {
      days = termVal * 30; // Approximation: Use 30 days per month
    }
    setCalculatedTermInDays(days);
  }, [loanTermValue, loanTermUnit]);

  // Calculate Total Due (triggered by principal or interest rate)
  useEffect(() => {
    // Only run if principal or interest rate was the last edited field
    if (lastEditedField === 'principal' || lastEditedField === 'interestRate') {
        const principalNum = parseFloat(principal);
        const rateNum = parseFloat(interestRate);

        if (!isNaN(principalNum) && principalNum > 0 && !isNaN(rateNum) && rateNum >= 0) {
            const total = principalNum * (1 + rateNum / 100);
            setCalculatedTotalDue(total);
        } else {
            setCalculatedTotalDue(0);
        }
    }
  }, [principal, interestRate, lastEditedField]); // Add lastEditedField dependency

  // Calculate Installment Amount (triggered by totalDue, term, frequency)
  useEffect(() => {
    // Only run if NOT triggered by manualInstallment change
     if (lastEditedField !== 'manualInstallment') {
        const totalDueNum = parseFloat(calculatedTotalDue);
        const termDaysNum = calculatedTermInDays;
        const freqNum = parseInt(installmentFrequencyDays, 10);

        if (!isNaN(totalDueNum) && totalDueNum > 0 &&
            termDaysNum > 0 &&
            !isNaN(freqNum) && freqNum > 0 && termDaysNum >= freqNum) {
            const numInstallments = Math.ceil(termDaysNum / freqNum);
            setNumberOfInstallments(numInstallments);
            const installment = totalDueNum / numInstallments;
            setCalculatedInstallmentAmount(installment);
            // ALWAYS update manualInstallmentAmount when calculation runs based on other fields
            setManualInstallmentAmount(installment.toFixed(2));
            clearCalculationError(); // Clear error if calculation is now valid
        } else {
            setNumberOfInstallments(0);
            setCalculatedInstallmentAmount(0);
            // Don't clear manualInstallmentAmount here, let user edit it
        }
     }
    // Depend on calculatedTermInDays
  }, [calculatedTotalDue, calculatedTermInDays, installmentFrequencyDays, lastEditedField]); // Add lastEditedField dependency

  // Recalculate Interest Rate (triggered by manualInstallment change)
  useEffect(() => {
      // Only run if manualInstallment was the last edited field
      if (lastEditedField === 'manualInstallment') {
          clearCalculationError(); // Clear previous error before recalculating

          const manualInstallmentNum = parseFloat(manualInstallmentAmount);
          const principalNum = parseFloat(principal);
          const termDaysNum = calculatedTermInDays;
          const freqNum = parseInt(installmentFrequencyDays, 10);

          if (!isNaN(manualInstallmentNum) && manualInstallmentNum > 0 &&
              !isNaN(principalNum) && principalNum > 0 &&
              termDaysNum > 0 &&
              !isNaN(freqNum) && freqNum > 0 && termDaysNum >= freqNum) {

              const numInstallments = Math.ceil(termDaysNum / freqNum);
              const totalRepayment = manualInstallmentNum * numInstallments;

              if (totalRepayment >= principalNum) {
                  const rate = ((totalRepayment / principalNum) - 1) * 100;
                  setInterestRate(rate.toFixed(2));
                  setCalculatedTotalDue(totalRepayment); // Update total due based on manual input
              } else {
                  // Set error specifically for this case
                  setAddError("Manual installment amount is too low, resulting in negative interest.");
                  // Optionally reset interest rate display or leave it
                  // setInterestRate("N/A");
              }
          } else {
              // Handle cases where other inputs are invalid during manual installment edit
              // Maybe show a different error or just don't update the rate
          }
      }
  }, [manualInstallmentAmount, principal, calculatedTermInDays, installmentFrequencyDays, lastEditedField]); // Add lastEditedField dependency

  // --- Event Handlers ---
  const handleClientSearch = async (event) => {
    const searchTerm = event.target.value;
    setClientSearchTerm(searchTerm);
    setSelectedClient(null); // Clear selected client when searching
    setSearchedClients([]); // Clear previous results immediately

    if (searchTerm.trim().length < 2) {
      setIsSearchingClients(false);
      return;
    }

    setIsSearchingClients(true);
    setAddError(""); // Clear previous add errors

    try {
      const token = getToken();
      if (!token) {
        setAddError("Authentication token not found.");
        setIsSearchingClients(false);
        return;
      }
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/clients/search?q=${searchTerm.trim()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchedClients(response.data);
    } catch (err) {
      console.error("Error searching clients:", err);
      setAddError(err.response?.data?.message || "Failed to search clients.");
      setSearchedClients([]);
    } finally {
      setIsSearchingClients(false);
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    // Keep search term concise
    setClientSearchTerm(`${client.name} (${client.nic})`);
    setSearchedClients([]); // Hide search results
  };

  const handleAddLoan = async (event) => {
    event.preventDefault();
    setAddError("");
    setSuccessMessage("");

    if (!selectedClient) {
      setAddError("Please select a client first.");
      return;
    }

    const termDaysNum = calculatedTermInDays; // Use calculated term in days

    // Validation using calculatedTermInDays
    if (!principal || termDaysNum <= 0 || !installmentFrequencyDays || !interestRate || !manualInstallmentAmount) {
      setAddError("Principal, Term, Frequency, Interest Rate, and Installment Amount are required.");
      return;
    }

    const principalNum = parseFloat(principal);
    const freqNum = parseInt(installmentFrequencyDays, 10);
    const rateNum = parseFloat(interestRate);
    const installmentNum = parseFloat(manualInstallmentAmount);

    if (isNaN(principalNum) || principalNum <= 0 ||
        isNaN(freqNum) || freqNum <= 0 ||
        isNaN(rateNum) || rateNum < 0 ||
        isNaN(installmentNum) || installmentNum <= 0) {
      setAddError("Please enter valid numeric values for loan details.");
      return;
    }
    if (termDaysNum < freqNum) {
        setAddError("Loan term (in days) cannot be less than installment frequency.");
        return;
    }

    // Ensure calculation error is cleared before final validation
    clearCalculationError();

    // Re-check for negative interest based on final values before submitting
    const finalPrincipal = parseFloat(principal);
    const finalInstallment = parseFloat(manualInstallmentAmount);
    const finalTermDays = calculatedTermInDays;
    const finalFreq = parseInt(installmentFrequencyDays, 10);
    if (!isNaN(finalPrincipal) && finalPrincipal > 0 &&
        !isNaN(finalInstallment) && finalInstallment > 0 &&
        finalTermDays > 0 && !isNaN(finalFreq) && finalFreq > 0 && finalTermDays >= finalFreq) {
        const finalNumInstallments = Math.ceil(finalTermDays / finalFreq);
        const finalTotalRepayment = finalInstallment * finalNumInstallments;
        if (finalTotalRepayment < finalPrincipal) {
             setAddError("Manual installment amount is too low, resulting in negative interest.");
             return; // Prevent submission
        }
    }

    // Validation using calculatedTermInDays
    if (!principal || termDaysNum <= 0 || !installmentFrequencyDays || !interestRate || !manualInstallmentAmount || parseFloat(interestRate) < 0) { // Added check for negative rate display
      setAddError("Principal, Term, Frequency, valid Interest Rate, and Installment Amount are required.");
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        setAddError("Authentication token not found.");
        return;
      }

      const loanData = {
        client_id: selectedClient.client_id,
        principal_amount: principalNum,
        interest_rate: rateNum,
        loan_term_days: termDaysNum, // Send calculated term in days
        installment_frequency_days: freqNum,
        installment_amount: installmentNum, // Send the potentially manually adjusted installment amount
      };

      // Correct the endpoint URL from '/api/loans/add' to '/api/loans/'
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/loans/`, loanData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Clear form fields and selection
      setSelectedClient(null);
      setClientSearchTerm("");
      setPrincipal("");
      setLoanTermValue(""); // Clear term value
      setLoanTermUnit("Days"); // Reset term unit
      setInterestRate("24.8");
      setInstallmentFrequencyDays("");
      setManualInstallmentAmount("");
      setCalculatedTotalDue(0);
      setCalculatedInstallmentAmount(0);
      setNumberOfInstallments(0);
      setCalculatedTermInDays(0); // Reset calculated days

      fetchLoans(); // Refresh the loan list
      setSuccessMessage(response.data.message || "Loan added successfully!");
      setOpenSnackbar(true); // Show success Snackbar
    } catch (err) {
      console.error("Error adding loan:", err);
      // Display the actual error message from the backend if available
      setAddError(err.response?.data?.message || err.message || "Failed to add loan.");
    }
  };

  // --- New Edit/Delete Handlers ---
  const handleEditLoan = (loanId) => {
    // Placeholder for edit functionality
    alert(`Edit functionality for loan ${loanId} is not yet implemented.`);
    // Later: Open a modal, fetch loan details, populate form, handle update submission
  };

  const handleDeleteLoan = async (loanId) => {
    if (window.confirm(`Are you sure you want to delete loan with ID: ${loanId}? This will also delete all associated installments.`)) {
      try {
        setError(''); // Clear previous table errors
        setSuccessMessage(''); // Clear success message on new action
        const token = getToken();
        if (!token) {
            setError("Authentication token not found.");
            return;
        }
        await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/loans/${loanId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        fetchLoans(); // Refresh the list after successful deletion
        setSuccessMessage('Loan deleted successfully!');
        setOpenSnackbar(true); // Open Snackbar
      } catch (err) {
        console.error(`Error deleting loan ${loanId}:`, err);
        setError(err.response?.data?.message || "Failed to delete loan.");
        // Consider showing error in the table error section or a separate Snackbar
      }
    }
  };
  // --- End New Edit/Delete Handlers ---

  // --- Table Data ---
  // Filter loans based on loanSearchTerm (Client Name, NIC, Loan ID)
  const filteredLoans = loans.filter(
    (loan) =>
      loan.loan_id.toString().includes(loanSearchTerm) ||
      (loan.client_id && loan.client_id.toString().includes(loanSearchTerm)) ||
      (loan.client_name && loan.client_name.toLowerCase().includes(loanSearchTerm.toLowerCase())) ||
      (loan.client_nic && loan.client_nic.toLowerCase().includes(loanSearchTerm.toLowerCase()))
  );

  const loanColumns = [
    { name: "loan_id", label: "Loan ID", align: "left", width: "5%" },
    { name: "client", label: "Client (NIC)", align: "left" },
    { name: "principal", label: "Principal (LKR)", align: "right" },
    { name: "total_due", label: "Total Due (LKR)", align: "right" },
    { name: "remaining_balance", label: "Remaining (LKR)", align: "right" }, // New Column
    { name: "installment", label: "Installment (LKR)", align: "right" },
    { name: "term", label: "Term (Days)", align: "center" }, // Label remains Days as value is stored in days
    { name: "frequency", label: "Frequency (Days)", align: "center" },
    { name: "interest_rate", label: "Interest (%)", align: "center" }, // Added Interest Rate column
    { name: "created_at", label: "Created Date", align: "center" }, // Changed name and label
    { name: "status", label: "Status", align: "center" },
    { name: "action", label: "Action", align: "center", width: "10%" }, // Adjusted width
  ];

  const loanRows = filteredLoans.map((loan) => ({
    loan_id: (
      <VuiTypography variant="caption" color="white" fontWeight="medium">
        {loan.loan_id}
      </VuiTypography>
    ),
    client: (
      <VuiBox display="flex" flexDirection="column">
        <VuiTypography variant="caption" color="white" fontWeight="medium">
          {loan.client_name || "N/A"}
        </VuiTypography>
        <VuiTypography variant="caption" color="text" fontWeight="regular">
          {loan.client_nic || "N/A"}
        </VuiTypography>
      </VuiBox>
    ),
    principal: (
      <VuiTypography variant="caption" color="white" fontWeight="medium">
        {formatCurrency(loan.principal_amount)}
      </VuiTypography>
    ),
    total_due: (
      <VuiTypography variant="caption" color="white" fontWeight="medium">
        {/* Use loan.total_amount_due from backend */}
        {formatCurrency(loan.total_amount_due)}
      </VuiTypography>
    ),
    // New Row Data for Remaining Balance
    remaining_balance: (
      <VuiTypography variant="caption" color={loan.remaining_balance <= 0 ? "success" : "white"} fontWeight="medium">
        {formatCurrency(loan.remaining_balance)}
      </VuiTypography>
    ),
    installment: (
      <VuiTypography variant="caption" color="white" fontWeight="medium">
        {formatCurrency(loan.installment_amount)}
      </VuiTypography>
    ),
    term: (
      <VuiTypography variant="caption" color="white" fontWeight="medium">
        {loan.loan_term_days}
      </VuiTypography>
    ),
    frequency: (
      <VuiTypography variant="caption" color="white" fontWeight="medium">
        {loan.installment_frequency_days}
      </VuiTypography>
    ),
    interest_rate: ( // Added Interest Rate data
        <VuiTypography variant="caption" color="white" fontWeight="medium">
          {/* Check if interest_rate is a number before calling toFixed */}
          {loan.interest_rate}
        </VuiTypography>
    ),
    created_at: ( // Changed from start_date
      <VuiTypography variant="caption" color="white" fontWeight="medium">
        {/* Use loan.created_at from backend */}
        {formatDate(loan.created_at)}
      </VuiTypography>
    ),
    status: (
      <VuiTypography variant="caption" color={loan.status === 'Active' ? "success" : loan.status === 'Completed' ? "info" : "error"} fontWeight="medium">
        {loan.status}
      </VuiTypography>
    ),
    action: (
      <VuiBox display="flex" justifyContent="center" alignItems="center">
        {/* Edit button */}
        <IconButton size="small" color="info" sx={{ margin: '0 4px' }} onClick={() => handleEditLoan(loan.loan_id)}>
          <Icon>edit</Icon>
        </IconButton>
        {/* Delete button */}
        <IconButton
            size="small"
            color="error"
            sx={{ margin: '0 4px' }}
            onClick={() => handleDeleteLoan(loan.loan_id)}
        >
          <Icon>delete</Icon>
        </IconButton>
      </VuiBox>
    ),
  }));

  return (
    <DashboardLayout>
      <DashboardNavbar />

      {/* --- Add Loan Form --- */}
      {/* Replace CoverLayout with Card */}
      <VuiBox py={3}> {/* Add padding */}
        <Card>
          <VuiBox p={3}> {/* Add padding inside Card */}
            <VuiTypography variant="h5" color="white" fontWeight="medium" mb={3}>
              Add New Loan
            </VuiTypography>
            <VuiBox component="form" role="form" onSubmit={handleAddLoan}>
              {/* Display Add Loan Error */}
              {addError && (
                <VuiBox mb={2}>
                  <VuiAlert color="error" dismissible onDismiss={() => setAddError("")}>
                    <VuiTypography variant="caption" color="white">
                      {addError}
                    </VuiTypography>
                  </VuiAlert>
                </VuiBox>
              )}

              {/* Client Search Input */}
              <VuiBox mb={2} sx={{ position: "relative" }}>
                <VuiBox mb={1} ml={0.5}>
                  <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                    Search Client (Name or NIC)
                  </VuiTypography>
                </VuiBox>
                <GradientBorder
                  minWidth="100%"
                  padding="1px"
                  borderRadius={borderRadius.lg}
                  backgroundImage={radialGradient(
                      palette.gradients.borderLight.main,
                      palette.gradients.borderLight.state,
                      palette.gradients.borderLight.angle
                  )} // Use radialGradient
                >
                  <VuiInput
                    type="text"
                    placeholder="Start typing to search..."
                    value={clientSearchTerm}
                    onChange={handleClientSearch}
                    disabled={!!selectedClient} // Disable if a client is selected
                    sx={({ typography: { size } }) => ({ fontSize: size.sm })}
                  />
                </GradientBorder>
                {isSearchingClients && (
                  <CircularProgress size={20} sx={{ position: "absolute", right: 10, top: 40 }} />
                )}
                {/* Search Results Dropdown */}
                {searchedClients.length > 0 && !selectedClient && (
                  <Paper
                    sx={{
                      position: "absolute",
                      zIndex: 10,
                      width: "100%",
                      maxHeight: 200,
                      overflow: "auto",
                      mt: 1,
                      bgcolor: background.card, // Use theme background color
                      border: `1px solid ${grey[700]}`, // Add border
                      borderRadius: borderRadius.md,
                      boxShadow: 3, // Add some shadow
                    }}
                  >
                    <List dense>
                      {searchedClients.map((client) => (
                        <ListItem
                          button
                          key={client.client_id}
                          onClick={() => handleSelectClient(client)}
                          sx={{ "&:hover": { backgroundColor: info.main } }}
                        >
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

              {/* Selected Client Display */}
              {selectedClient && (
                <VuiBox
                  mb={2}
                  p={1.5} // Add padding
                  sx={{
                    border: `1px solid ${grey[700]}`,
                    borderRadius: borderRadius.md,
                    backgroundColor: background.default, // Slightly different background
                  }}
                >
                  <Grid container spacing={1} alignItems="center">
                    <Grid item xs={10}>
                      <VuiTypography variant="button" color="white" fontWeight="medium">
                        Selected: {selectedClient.name}
                      </VuiTypography>
                      <VuiTypography variant="caption" color="text" ml={1}>
                        (NIC: {selectedClient.nic}, Tel: {selectedClient.telephone})
                      </VuiTypography>
                    </Grid>
                    <Grid item xs={2} display="flex" justifyContent="flex-end">
                      <VuiButton
                        size="small"
                        color="error"
                        variant="text"
                        sx={{ mt: 0, p: 0.5 }} // Adjust padding/margin
                        onClick={() => {
                          setSelectedClient(null);
                          setClientSearchTerm("");
                          // Optionally clear loan details too
                          setPrincipal("");
                          setLoanTermValue("");
                          setLoanTermUnit("Days");
                          setInterestRate("24.8");
                          setInstallmentFrequencyDays("");
                          setManualInstallmentAmount("");
                          setCalculatedTermInDays(0); // Reset calculated days
                        }}
                      >
                        Change
                      </VuiButton>
                    </Grid>
                  </Grid>
                </VuiBox>
              )}

              {/* Loan Details Inputs (only show if client is selected) */}
              {selectedClient && (
                <>
                  <Grid container spacing={2}>
                    {/* Principal Amount Input */}
                    <Grid item xs={12} sm={6}>
                      <VuiBox mb={2}>
                        <VuiBox mb={1} ml={0.5}>
                          <VuiTypography
                            component="label"
                            variant="button"
                            color="white"
                            fontWeight="medium"
                          >
                            Principal Amount (LKR)
                          </VuiTypography>
                        </VuiBox>
                        <GradientBorder minWidth="100%" padding="1px" borderRadius={borderRadius.lg} backgroundImage={radialGradient(palette.gradients.borderLight.main, palette.gradients.borderLight.state, palette.gradients.borderLight.angle)}>
                          <VuiInput
                            type="number"
                            placeholder="e.g., 50000"
                            value={principal}
                            onChange={handlePrincipalChange}
                            onFocus={() => setLastEditedField("principal")} // Track focus
                            sx={({ typography: { size } }) => ({ fontSize: size.sm })}
                          />
                        </GradientBorder>
                      </VuiBox>
                    </Grid>

                    {/* Interest Rate Input */}
                    <Grid item xs={12} sm={6}>
                      <VuiBox mb={2}>
                        <VuiBox mb={1} ml={0.5}>
                          <VuiTypography
                            component="label"
                            variant="button"
                            color="white"
                            fontWeight="medium"
                          >
                            Annual Interest Rate (%)
                          </VuiTypography>
                        </VuiBox>
                        <GradientBorder minWidth="100%" padding="1px" borderRadius={borderRadius.lg} backgroundImage={radialGradient(palette.gradients.borderLight.main, palette.gradients.borderLight.state, palette.gradients.borderLight.angle)}>
                          <VuiInput
                            type="number"
                            placeholder="e.g., 24.8"
                            value={interestRate}
                            onChange={handleInterestRateChange}
                            onFocus={() => setLastEditedField("interestRate")} // Track focus
                            sx={({ typography: { size } }) => ({ fontSize: size.sm })}
                            step="0.1" // Allow decimal input
                          />
                        </GradientBorder>
                      </VuiBox>
                    </Grid>

                    {/* Loan Term Input Value */}
                    <Grid item xs={8} sm={4}> {/* Adjusted grid size */}
                      <VuiBox mb={2}>
                        <VuiBox mb={1} ml={0.5}>
                          <VuiTypography
                            component="label"
                            variant="button"
                            color="white"
                            fontWeight="medium"
                          >
                            Loan Term Value
                          </VuiTypography>
                        </VuiBox>
                        <GradientBorder minWidth="100%" padding="1px" borderRadius={borderRadius.lg} backgroundImage={radialGradient(palette.gradients.borderLight.main, palette.gradients.borderLight.state, palette.gradients.borderLight.angle)}>
                          <VuiInput
                            type="number"
                            placeholder="e.g., 100"
                            value={loanTermValue}
                            onChange={handleLoanTermValueChange}
                            onFocus={() => setLastEditedField("loanTermValue")} // Track focus
                            sx={({ typography: { size } }) => ({ fontSize: size.sm })}
                          />
                        </GradientBorder>
                      </VuiBox>
                    </Grid>

                    {/* Loan Term Unit Select */}
                    <Grid item xs={4} sm={2}> {/* Adjusted grid size */}
                       <VuiBox mb={2} sx={{ minWidth: 120 }}>
                         <VuiBox mb={1} ml={0.5}>
                           <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                             Unit
                           </VuiTypography>
                         </VuiBox>
                         {/* Wrap Select in GradientBorder if desired, or style directly */}
                         <FormControl fullWidth variant="outlined" size="small">
                            {/* <InputLabel id="term-unit-label" sx={{color: grey[400]}}>Unit</InputLabel> */}
                             <Select
                               labelId="term-unit-label"
                               id="term-unit-select"
                               value={loanTermUnit}
                               onChange={handleLoanTermUnitChange}
                               onFocus={() => setLastEditedField("loanTermUnit")} // Track focus
                               sx={{
                                 color: 'white',
                                 backgroundColor: 'rgba(255, 255, 255, 0.05)', // Subtle background
                                 border: `1px solid ${grey[700]}`,
                                 borderRadius: borderRadius.md,
                                 fontSize: size.sm,
                                 '& .MuiSelect-icon': {
                                   color: 'white',
                                 },
                                 '& .MuiOutlinedInput-notchedOutline': {
                                   borderColor: 'transparent', // Hide default outline
                                 },
                                 '&:hover .MuiOutlinedInput-notchedOutline': {
                                   borderColor: grey[600], // Show border on hover
                                 },
                                 '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                   borderColor: info.main, // Highlight border when focused
                                 },
                                 '& .MuiSelect-select': {
                                    padding: '10px 14px', // Adjust padding to match VuiInput
                                 }
                               }}
                               MenuProps={{ // Style the dropdown menu
                                   PaperProps: {
                                       sx: {
                                           backgroundColor: background.card,
                                           color: 'white',
                                           border: `1px solid ${grey[700]}`,
                                       }
                                   }
                               }}
                             >
                               <MenuItem value={"Days"} sx={{fontSize: size.sm}}>Days</MenuItem>
                               <MenuItem value={"Weeks"} sx={{fontSize: size.sm}}>Weeks</MenuItem>
                               <MenuItem value={"Months"} sx={{fontSize: size.sm}}>Months</MenuItem>
                             </Select>
                         </FormControl>
                       </VuiBox>
                    </Grid>


                    {/* Installment Frequency Input */}
                    <Grid item xs={12} sm={6}>
                      <VuiBox mb={2}>
                        <VuiBox mb={1} ml={0.5}>
                          <VuiTypography
                            component="label"
                            variant="button"
                            color="white"
                            fontWeight="medium"
                          >
                            Installment Frequency (Days)
                          </VuiTypography>
                        </VuiBox>
                        <GradientBorder minWidth="100%" padding="1px" borderRadius={borderRadius.lg} backgroundImage={radialGradient(palette.gradients.borderLight.main, palette.gradients.borderLight.state, palette.gradients.borderLight.angle)}>
                          <VuiInput
                            type="number"
                            placeholder="e.g., 7 for weekly"
                            value={installmentFrequencyDays}
                            onChange={handleFrequencyChange}
                            onFocus={() => setLastEditedField("installmentFrequencyDays")} // Track focus
                            sx={({ typography: { size } }) => ({ fontSize: size.sm })}
                          />
                        </GradientBorder>
                      </VuiBox>
                    </Grid>

                    {/* Calculated Total Due Display */}
                     <Grid item xs={12} sm={6}>
                        <VuiBox mb={2}>
                            <VuiTypography variant="button" color="text" fontWeight="medium" ml={0.5}>
                                Calculated Total Due:
                            </VuiTypography>
                            <VuiTypography variant="body2" color="white" fontWeight="bold" ml={0.5}>
                                {formatCurrency(calculatedTotalDue)}
                            </VuiTypography>
                            <VuiTypography variant="caption" color="text" ml={0.5}>
                                ({numberOfInstallments > 0 ? `${numberOfInstallments} installments` : 'N/A'})
                            </VuiTypography>
                        </VuiBox>
                     </Grid>

                    {/* Installment Amount Input (Editable) */}
                    <Grid item xs={12} sm={6}>
                      <VuiBox mb={2}>
                        <VuiBox mb={1} ml={0.5}>
                          <VuiTypography
                            component="label"
                            variant="button"
                            color="white"
                            fontWeight="medium"
                          >
                            Installment Amount (LKR)
                          </VuiTypography>
                        </VuiBox>
                        <GradientBorder minWidth="100%" padding="1px" borderRadius={borderRadius.lg} backgroundImage={radialGradient(palette.gradients.borderLight.main, palette.gradients.borderLight.state, palette.gradients.borderLight.angle)}>
                          <VuiInput
                            type="number"
                            name="manualInstallment" // Add name for identifying focus
                            placeholder="Calculated or enter manually"
                            value={manualInstallmentAmount}
                            onChange={handleManualInstallmentChange}
                            onFocus={() => setLastEditedField("manualInstallment")} // Track focus
                            sx={({ typography: { size } }) => ({ fontSize: size.sm })}
                            step="0.01" // Allow cents
                          />
                        </GradientBorder>
                         <VuiTypography variant="caption" color="text" ml={0.5} mt={0.5}>
                            (Calculated: {formatCurrency(calculatedInstallmentAmount)})
                         </VuiTypography>
                      </VuiBox>
                    </Grid>

                  </Grid>

                  {/* Submit Button */}
                  <VuiBox mt={4} mb={1}> {/* Increased top margin */}
                    <VuiButton type="submit" color="info" fullWidth>
                      Add Loan
                    </VuiButton>
                  </VuiBox>
                </>
              )}
            </VuiBox>
          </VuiBox>
        </Card>
      </VuiBox> {/* End Add Loan Form Box */}


      {/* --- Loan List Table --- */}
      <VuiBox pb={3}> {/* Adjusted padding */}
        <VuiBox> {/* Removed mb={3} */}
          <Card>
            <VuiBox display="flex" justifyContent="space-between" alignItems="center" mb="22px" px={2} pt={2}>
              <VuiTypography variant="lg" color="white">
                Existing Loans
              </VuiTypography>
              {/* Loan Search Input */}
              <VuiBox sx={{ width: '250px' }}>
                 <VuiInput
                    placeholder="Search Loans (ID, Name, NIC)..."
                    value={loanSearchTerm}
                    onChange={(e) => setLoanSearchTerm(e.target.value)}
                    icon={{ component: "search", direction: "left" }}
                    sx={({ typography: { size } }) => ({
                        fontSize: size.sm,
                    })}
                 />
              </VuiBox>
            </VuiBox>

            {/* Conditional Rendering for Table Content */}
            {isLoadingLoans ? (
                <VuiBox p={3} textAlign="center">
                    <CircularProgress color="inherit" size={40} />
                    <VuiTypography variant="h6" color="text" mt={2}>Loading loans...</VuiTypography>
                </VuiBox>
            ) : error ? (
                <VuiBox mb={2} p={2} mx={2} sx={{ backgroundColor: 'rgba(255, 0, 0, 0.1)', borderRadius: 'md' }}>
                    <VuiTypography variant="caption" color="error">
                        {error}
                    </VuiTypography>
                </VuiBox>
            ) : filteredLoans.length === 0 ? ( // Use filteredLoans here
                <VuiBox p={3} textAlign="center">
                    <VuiTypography variant="h6" color="text">No loans found matching your search.</VuiTypography>
                </VuiBox>
            ) : (
                // --- Scrollable Table Container ---
                <VuiBox
                  sx={{
                    maxHeight: "600px", // Set a max height (adjust as needed)
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
                    // Optional: Style scrollbar
                     '&::-webkit-scrollbar': { width: '8px' },
                     '&::-webkit-scrollbar-track': { backgroundColor: grey[800] },
                     '&::-webkit-scrollbar-thumb': { backgroundColor: grey[600], borderRadius: '4px' },
                     '&::-webkit-scrollbar-thumb:hover': { backgroundColor: grey[500] }
                  }}
                >
                  <Table columns={loanColumns} rows={loanRows} />
                </VuiBox>
                 // --- End Scrollable Table Container ---
            )}
            
          </Card>
        </VuiBox>
      </VuiBox>

      {/* Snackbar for Success Messages */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} // Position bottom right
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%', backgroundColor: 'success.main' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

export default Loans;
