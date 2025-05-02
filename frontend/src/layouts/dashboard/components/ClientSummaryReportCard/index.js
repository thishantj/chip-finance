import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

// MUI components
import { Card, Grid, TextField, CircularProgress, Autocomplete, Paper, List, ListItem, ListItemText } from "@mui/material";
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { startOfMonth, endOfDay } from 'date-fns';

// Vision UI Dashboard components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiButton from "components/VuiButton";
import VuiAlert from "components/VuiAlert";

// Vision UI Dashboard base styles
import colors from "assets/theme/base/colors";
import typography from "assets/theme/base/typography";
import borders from "assets/theme/base/borders";

// Helper to get token
import { getToken } from "utils/auth";

// Helper function from theme
import pxToRem from "assets/theme/functions/pxToRem";

const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "N/A";
    return parseFloat(amount).toLocaleString("en-LK", {
        style: "currency",
        currency: "LKR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// Helper to format date as YYYY-MM-DD for API calls
const formatDateForAPI = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function ClientSummaryReportCard() {
  const { grey, info, background, white, black, inputColors, text } = colors; // Removed gradients
  const { size } = typography;
  const { borderRadius, borderWidth } = borders;

  // State for dates (using separate start/end)
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));

  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [searchedClients, setSearchedClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [clientSummaryData, setClientSummaryData] = useState(null); // To store fetched summary
  const [isGeneratingReport, setIsGeneratingReport] = useState(false); // New state for report generation loading

  // Debounce search function
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  };

  // --- Client Search Logic ---
  const triggerClientSearch = async (searchTerm) => {
    if (searchTerm.trim().length < 2) {
      setSearchedClients([]);
      setIsSearchingClients(false);
      setSearchError("");
      return;
    }

    setIsSearchingClients(true);
    setSearchError("");
    try {
      const token = getToken();
      if (!token) throw new Error("Authentication token not found.");
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/clients/search?q=${searchTerm.trim()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchedClients(response.data);
    } catch (err) {
      console.error("Error searching clients:", err);
      setSearchError(err.response?.data?.message || "Failed to search clients.");
      setSearchedClients([]);
    } finally {
      setIsSearchingClients(false);
    }
  };

  // Debounced version of the search trigger
  const debouncedSearch = useCallback(debounce(triggerClientSearch, 300), []); // 300ms delay

  // --- Client Selection Logic ---
  const handleSelectClient = (client) => {
    setSelectedClient(client);
    // Update search term to reflect selection, prevent re-searching
    setClientSearchTerm(client ? `${client.name} (${client.nic || 'N/A'})` : "");
    setSearchedClients([]); // Hide dropdown after selection
    if (client) {
      fetchClientSummary(client.client_id); // Fetch summary for the selected client
    } else {
      setClientSummaryData(null); // Clear summary if client is deselected
      setSummaryError("");
    }
  };

  // --- Fetch Client Summary Data ---
  const fetchClientSummary = useCallback(async (clientId) => {
    // Use startDate and endDate from state
    if (!clientId || !startDate || !endDate) return;
    if (startDate > endDate) {
        setSummaryError("Start date cannot be after end date.");
        return;
    }

    setIsLoadingSummary(true);
    setSummaryError("");
    setClientSummaryData(null); // Clear previous data

    try {
      const token = getToken();
      if (!token) throw new Error("Authentication token not found.");

      const startIso = formatDateForAPI(startDate); // Use helper function
      const endIso = formatDateForAPI(endDate); // Use helper function

      const dataFetchUrl = `${process.env.REACT_APP_API_BASE_URL}/api/clients/${clientId}/summary`;

      console.log("Attempting to fetch summary data from:", dataFetchUrl, "with params:", { startDate: startIso, endDate: endIso });

      const response = await axios.get(dataFetchUrl, {
        params: { startDate: startIso, endDate: endIso },
        headers: { Authorization: `Bearer ${token}` },
      });

      // --- Corrected Condition ---
      if (response.status === 200) { // Check for SUCCESSFUL status
        setClientSummaryData(response.data); // Set data on success
        setSummaryError(""); // Clear any previous error
      } else {
        // Handle non-200 responses as errors (though axios usually throws for non-2xx)
        setSummaryError(`Failed to fetch client summary data. Status: ${response.status}`);
        setClientSummaryData(null);
      }
      // --- End Corrected Condition ---

    } catch (err) {
      console.error("Error fetching client summary:", err);
      let errorMsg = "Failed to fetch client summary.";
      if (err.response) {
          // Specific check for 404 on the intended data endpoint
          if (err.response.status === 404) {
              errorMsg = `Failed to fetch summary data. The required API endpoint (${err.config.url}) was not found (404). Please ensure the backend route is implemented.`;
          } else {
              errorMsg = err.response.data?.message || `Error ${err.response.status}: Failed to fetch summary.`;
          }
      } else if (err.request) {
          errorMsg = "Network error: Could not fetch client summary.";
      } else {
          errorMsg = err.message || "An unexpected error occurred while fetching summary.";
      }
      setSummaryError(errorMsg);
      setClientSummaryData(null);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [startDate, endDate]); // Removed selectedClient from dependencies as it's passed directly

  // Fetch summary when date range or client changes
  useEffect(() => {
    if (selectedClient) {
      fetchClientSummary(selectedClient.client_id);
    } else {
        // Clear data if client is deselected
        setClientSummaryData(null);
        setSummaryError("");
        setIsLoadingSummary(false); // Ensure loading stops
    }
    // Depend on selectedClient directly, fetchClientSummary has its own dependencies
  }, [selectedClient, fetchClientSummary]);


  // --- Report Generation Handlers ---
  const handlePreview = async () => { // Make async
    if (!selectedClient || !startDate || !endDate) return;
    setIsGeneratingReport(true); // Use report generation loading state
    setSummaryError(""); // Clear previous errors
    const token = getToken();
    if (!token) {
      setSummaryError("Authentication token not found.");
      setIsGeneratingReport(false);
      return;
    }

    const startIso = formatDateForAPI(startDate);
    const endIso = formatDateForAPI(endDate);
    // *** This preview URL still needs to be implemented on the backend ***
    const previewUrl = `${process.env.REACT_APP_API_BASE_URL}/api/reports/client-summary/${selectedClient.client_id}/preview`;

    console.log("Requesting preview from URL:", previewUrl, "with params:", { startDate: startIso, endDate: endIso });

    try {
      // Fetch the preview PDF as a blob
      const response = await axios.get(previewUrl, {
        params: { startDate: startIso, endDate: endIso },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob', // Expect a blob response
      });

      // Create a blob URL and open it in a new tab
      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank', 'noopener,noreferrer');
      URL.revokeObjectURL(fileURL); // Clean up blob URL after opening

    } catch (err) {
      console.error("Error generating client summary preview:", err);
      let specificError = "Failed to generate preview.";
      // Refined error handling similar to handleDownload
      if (err.response) {
          if (err.response.status === 404) {
              // *** Explicitly state the preview endpoint is missing ***
              specificError = `Preview endpoint not found (404). Check backend: ${previewUrl}`;
          } else if (err.response.data instanceof Blob) {
              try {
                  const errorText = await err.response.data.text();
                  const errorJson = JSON.parse(errorText);
                  specificError = errorJson.message || `Preview failed with status ${err.response.status}.`;
              } catch (parseError) {
                  specificError = `Preview failed with status ${err.response.status}, and error details could not be parsed.`;
              }
          } else {
               specificError = err.response.data?.message || `Preview failed with status ${err.response.status}.`;
          }
      } else if (err.request) {
          specificError = "Network error: Could not generate preview.";
      } else {
          specificError = err.message || "An unexpected error occurred during preview generation.";
      }
      setSummaryError(specificError);
    } finally {
      setIsGeneratingReport(false); // Turn off loading state
    }
  };

  const handleDownload = async () => {
    if (!selectedClient || !startDate || !endDate) return;
    setIsGeneratingReport(true); // Use report generation loading state
    setSummaryError("");
    const token = getToken();
    if (!token) {
      setSummaryError("Authentication token not found.");
      setIsGeneratingReport(false); // Turn off loading state
      return;
    }

    const startIso = formatDateForAPI(startDate);
    const endIso = formatDateForAPI(endDate);
     // *** This download URL still needs to be implemented on the backend ***
    const downloadUrl = `${process.env.REACT_APP_API_BASE_URL}/api/reports/client-summary/${selectedClient.client_id}/download`;

    console.log("Requesting download from URL:", downloadUrl, "with params:", { startDate: startIso, endDate: endIso }); // Log the exact URL and params

    try {
      const response = await axios.get(downloadUrl, {
        params: { startDate: startIso, endDate: endIso },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob', // Important for file download
      });

      // Create a link element to trigger the download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // Extract filename from content-disposition header if available, otherwise use a default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `client_${selectedClient.client_id}_summary_${startIso}_to_${endIso}.pdf`; // Default filename
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      // Clean up
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error downloading client summary report:", err);
      let specificError = "Failed to download report.";
      if (err.response) {
          // Check for 404 specifically
          if (err.response.status === 404) {
               // *** Explicitly state the download endpoint is missing ***
              specificError = `Download endpoint not found (404). Check backend: ${downloadUrl}`;
          } else if (err.response.data instanceof Blob) {
              // Try parsing blob error as before
              try {
                  const errorText = await err.response.data.text();
                  const errorJson = JSON.parse(errorText);
                  specificError = errorJson.message || `Download failed with status ${err.response.status}.`;
              } catch (parseError) {
                  specificError = `Download failed with status ${err.response.status}, and error details could not be parsed.`;
              }
          } else {
               specificError = err.response.data?.message || `Download failed with status ${err.response.status}.`;
          }
      } else if (err.request) {
          specificError = "Failed to download report. No response received from server.";
      } else {
          specificError = err.message || "An unexpected error occurred during download.";
      }
      setSummaryError(specificError);
    } finally {
      setIsGeneratingReport(false); // Turn off loading state
    }
  };

  // Common TextField styles for DatePicker & Autocomplete - Refined to match VuiInput more closely
  const inputFieldStyles = { // Renamed for broader use
    '& .MuiOutlinedInput-root': {
        backgroundColor: inputColors.backgroundColor,
        borderRadius: borderRadius.md,
        fontSize: size.sm,
        color: white.main, // Keep root color white (for icons etc.)
        height: pxToRem(40), // Match VuiInput small height
        padding: `${pxToRem(8)} ${pxToRem(12)}`,
        '& .MuiOutlinedInput-input': {
            color: grey[500],
            height: '100%',
            fontSize: size.sm,
            padding: '0 !important', // Remove default padding if needed, handled by root padding
            '&::placeholder': {
                color: text.secondary, // Use theme's secondary text color for placeholder (grey[500])
                opacity: 1, // Ensure placeholder is not transparent
            },
        },
        '& fieldset': {
            borderColor: inputColors.borderColor.main,
            borderWidth: borderWidth[1],
        },
        '&:hover fieldset': {
            borderColor: inputColors.borderColor.main,
        },
        '&.Mui-focused fieldset': {
            borderColor: info.main,
            borderWidth: borderWidth[2],
        },
        '& .MuiSvgIcon-root': { // Calendar/Dropdown icon
            color: text.secondary,
        },
        // Ensure Autocomplete clear/dropdown icons are styled
        '& .MuiAutocomplete-clearIndicator, & .MuiAutocomplete-popupIndicator': {
            color: text.secondary,
        },
        // Adjust padding for Autocomplete end adornments
        '&.MuiInputBase-adornedEnd': {
             paddingRight: `${pxToRem(35)} !important`, // Make space for icons
             // Ensure input text doesn't overlap icons
             '& .MuiOutlinedInput-input': {
                 paddingRight: `${pxToRem(40)} !important`, // Add padding to input itself if adornments overlap
                 color: grey[500], // Re-apply darker grey color for specificity
             }
        }
    },
    '& .MuiInputLabel-root': { // Style the label
        color: text.secondary,
        fontSize: size.sm,
        lineHeight: 1.5,
        transform: `translate(${pxToRem(12)}, ${pxToRem(10)}) scale(1)`,
        '&.MuiInputLabel-shrink': {
             transform: `translate(${pxToRem(12)}, -${pxToRem(6)}) scale(0.75)`,
        },
        '&.Mui-focused': {
            color: info.main,
        },
    },
     // Ensure placeholder color matches (already covered in .MuiOutlinedInput-input::placeholder)
  };


  return (
    <Card>
      <VuiBox p={2}>
        <VuiTypography variant="lg" color="white" fontWeight="bold" mb={3}> {/* Increased margin-bottom */}
          Client Summary Report
        </VuiTypography>

        <Grid container spacing={3}> {/* Main container spacing */}
          {/* Date Pickers */}
          <Grid item xs={12}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              {/* Container for the two date pickers with spacing between them */}
              <Grid container spacing={2}>
                {/* Start Date Picker */}
                <Grid item xs={12}> {/* Full width on all screen sizes */}
                   <DatePicker
                     label="Start Date"
                     value={startDate}
                     onChange={(newValue) => setStartDate(newValue)}
                     renderInput={(params) => (
                       <TextField
                         {...params}
                         variant="outlined"
                         size="small"
                         fullWidth // Ensure TextField takes full width of the Grid item
                         sx={inputFieldStyles} // Use common styles
                       />
                     )}
                     maxDate={endDate || undefined}
                   />
                </Grid>
                {/* End Date Picker */}
                 <Grid item xs={12}> {/* Full width on all screen sizes */}
                   <DatePicker
                     label="End Date"
                     value={endDate}
                     onChange={(newValue) => setEndDate(newValue)}
                     minDate={startDate || undefined}
                     renderInput={(params) => (
                       <TextField
                         {...params}
                         variant="outlined"
                         size="small"
                         fullWidth // Ensure TextField takes full width of the Grid item
                         sx={inputFieldStyles} // Use common styles
                       />
                     )}
                   />
                </Grid>
              </Grid>
            </LocalizationProvider>
          </Grid>

          {/* Client Search */}
          <Grid item xs={12}>
            <VuiBox sx={{ position: "relative" }}>
              <Autocomplete
                freeSolo
                options={searchedClients}
                getOptionLabel={(option) => option.name ? `${option.name} (${option.nic || 'N/A'})` : ""}
                value={selectedClient}
                onInputChange={(event, newInputValue, reason) => {
                  setClientSearchTerm(newInputValue); // Always update the visual input value
                  if (reason === 'input') {
                    setSelectedClient(null); // Clear selection when user types
                    setClientSummaryData(null);
                    setSummaryError(""); // Clear summary error on new input
                    debouncedSearch(newInputValue); // Trigger debounced search
                  } else if (reason === 'clear') {
                    handleSelectClient(null); // Clear selection and summary
                    setSearchedClients([]); // Clear search results
                  }
                  // 'reset' reason (selecting an option) is handled by onChange
                }}
                onChange={(event, newValue) => {
                  // Handle selection from dropdown or clearing
                  if (typeof newValue === 'object') {
                    handleSelectClient(newValue); // Handles null selection too
                  }
                  // Ignore string case for freeSolo for now, focus on selection
                }}
                inputValue={clientSearchTerm} // Controlled input value
                loading={isSearchingClients}
                loadingText="Searching..."
                noOptionsText={clientSearchTerm.length < 2 ? "Type 2+ characters" : (searchError || "No clients found")}
                filterOptions={(x) => x} // Backend filtering, so pass through options
                isOptionEqualToValue={(option, value) => option.client_id === value?.client_id}
                renderInput={(params) => (
                  // Use TextField styled to match VuiInput
                  <TextField
                    {...params}
                    placeholder="Search Client (Name, NIC, Tel)"
                    variant="outlined"
                    size="small" // Keep size consistent with DatePicker
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <React.Fragment>
                          {isSearchingClients ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </React.Fragment>
                      ),
                    }}
                    sx={inputFieldStyles} // Use common styles (styles updated above)
                  />
                )}
                PaperComponent={(props) => (
                    <Paper
                        {...props}
                        sx={{
                            bgcolor: background.card,
                            boxShadow: 3,
                            color: white.main, // Ensure text color in dropdown paper is white
                            marginTop: pxToRem(4),
                        }}
                    />
                )}
                 renderOption={(props, option) => (
                  // Important: Ensure props are spread onto the ListItem for Autocomplete functionality
                  <ListItem {...props} key={option.client_id} sx={{ "&:hover": { backgroundColor: info.main }, paddingTop: pxToRem(4.8), paddingBottom: pxToRem(4.8) }}>
                    <ListItemText
                      primaryTypographyProps={{ color: "white", fontSize: size.sm }} // Ensure primary text is white
                      secondaryTypographyProps={{ color: grey[500], fontSize: size.xs }} // Secondary text is grey
                      primary={option.name}
                      secondary={`NIC: ${option.nic || 'N/A'} / Tel: ${option.telephone || 'N/A'}`}
                    />
                  </ListItem>
                )}
              />
              {/* Display search error below Autocomplete if not shown in noOptionsText */}
              {searchError && !isSearchingClients && searchedClients.length === 0 && clientSearchTerm.length >= 2 && (
                 <VuiTypography variant="caption" color="error" mt={1}>{searchError}</VuiTypography>
              )}
            </VuiBox>
          </Grid>
        </Grid>

        {/* Loading State for Summary */}
        {isLoadingSummary && (
          <VuiBox display="flex" justifyContent="center" my={3}>
            <CircularProgress color="info" />
          </VuiBox>
        )}
        {summaryError && (
          <VuiAlert color="error" sx={{ my: 2 }} dismissible onClose={() => setSummaryError("")}> {/* Make dismissible */}
            <VuiTypography variant="caption" color="white">{summaryError}</VuiTypography>
          </VuiAlert>
        )}
        {/* --- Modified Display Logic --- */}
        {clientSummaryData && !isLoadingSummary && (
          <VuiBox mt={3}>
            {/* Overall Summary - Keep this section */}
            <VuiTypography variant="h6" color="white" mb={1}>Overall Summary</VuiTypography>
            <Grid container spacing={1} mb={2}>
                {/* Display fetched data - adjust keys based on actual API response */}
                <Grid item xs={6} sm={4}><VuiTypography variant="caption" color="text">Total Remaining Balance:</VuiTypography></Grid>
                <Grid item xs={6} sm={8}><VuiTypography variant="caption" color="white">{formatCurrency(clientSummaryData.overallSummary?.total_remaining_balance_all_loans)}</VuiTypography></Grid>
                <Grid item xs={6} sm={4}><VuiTypography variant="caption" color="text">Total Due (Active Loans):</VuiTypography></Grid>
                <Grid item xs={6} sm={8}><VuiTypography variant="caption" color="white">{formatCurrency(clientSummaryData.overallSummary?.total_due_all_active_loans)}</VuiTypography></Grid>
                <Grid item xs={6} sm={4}><VuiTypography variant="caption" color="text">Total Paid (in Range):</VuiTypography></Grid>
                <Grid item xs={6} sm={8}><VuiTypography variant="caption" color="white">{formatCurrency(clientSummaryData.overallSummary?.total_paid_in_range_all_loans)}</VuiTypography></Grid>
            </Grid>

            {/* --- Sections Removed from Main View --- */}
            {/* Active Loans - Removed */}
            {/* Completed Loans - Removed */}
            {/* Payments in Range - Removed */}

            {/* Action Buttons - Keep this section */}
            <VuiBox mt={3} display="flex" justifyContent="flex-end" gap={1}>
              <VuiButton variant="outlined" color="info" onClick={handlePreview} disabled={!clientSummaryData || isLoadingSummary || isGeneratingReport}>
                 {isGeneratingReport ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
                Preview
              </VuiButton>
              <VuiButton variant="contained" color="info" onClick={handleDownload} disabled={!clientSummaryData || isLoadingSummary || isGeneratingReport}>
                 {/* Add loading indicator to download button */}
                {isGeneratingReport ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
                Download
              </VuiButton>
            </VuiBox>
          </VuiBox>
        )}
         {/* Message when no client is selected */}
         {!selectedClient && !isLoadingSummary && !summaryError && (
             <VuiTypography variant="body2" color="text" textAlign="center" mt={3}>
                 Please search and select a client to view their summary.
             </VuiTypography>
         )}
      </VuiBox>
    </Card>
  );
}

export default ClientSummaryReportCard;
