import React, { useState } from "react";
import axios from "axios"; // Ensure axios is imported

// MUI components
import { Card, Grid, TextField, CircularProgress } from "@mui/material";
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker'; // Import DatePicker
import { startOfMonth, endOfDay } from 'date-fns'; // For default dates

// Vision UI Dashboard components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiButton from "components/VuiButton";

// Vision UI Dashboard base styles
import colors from "assets/theme/base/colors";
import typography from "assets/theme/base/typography";
import borders from "assets/theme/base/borders"; // Added borders

// Helper to get token (assuming it exists)
import { getToken } from "utils/auth"; // Adjust path as needed

// Helper function from theme (assuming it's available or can be imported)
import pxToRem from "assets/theme/functions/pxToRem"; // Import pxToRem if not already

// Helper to format date as YYYY-MM-DD for API calls
const formatDateForAPI = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function NetProfitReportCard() {
  const { grey, info, white, inputColors, text, background } = colors; // Added white, inputColors, text, background
  const { size } = typography;
  const { borderRadius, borderWidth } = borders; // Added borderWidth, borderRadius

  // Update state to hold start and end dates separately
  const [startDate, setStartDate] = useState(startOfMonth(new Date())); // State for start date
  const [endDate, setEndDate] = useState(endOfDay(new Date())); // State for end date
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerateReport = async (action) => {
    // Use startDate and endDate from state
    if (!startDate || !endDate) {
      setError("Please select a valid start and end date.");
      return;
    }
    if (startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    setLoading(true);
    setError("");

    const startIso = formatDateForAPI(startDate);
    const endIso = formatDateForAPI(endDate);
    const token = getToken();

    if (!token) {
      setError("Authentication token not found.");
      setLoading(false);
      return;
    }

    console.log(`Generating Net Profit Report (${action}) for ${startIso} to ${endIso}`);

    try {
      if (action === 'preview') {
        // Fetch preview as blob using axios
        const previewUrl = `${process.env.REACT_APP_API_BASE_URL}/api/reports/net-profit/preview`;
        console.log("Requesting preview from URL:", previewUrl, "with params:", { startDate: startIso, endDate: endIso });

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

      } else if (action === 'download') {
        const downloadUrl = `${process.env.REACT_APP_API_BASE_URL}/api/reports/net-profit/download`;
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
        let filename = `net_profit_report_${startIso}_to_${endIso}.pdf`; // Default filename
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
      }

    } catch (err) {
      console.error(`Error generating net profit report (${action}):`, err);
      // Refined error handling
      let specificError = `Failed to ${action} report.`;
      if (err.response) {
          const endpointUrl = action === 'preview'
              ? `${process.env.REACT_APP_API_BASE_URL}/api/reports/net-profit/preview`
              : `${process.env.REACT_APP_API_BASE_URL}/api/reports/net-profit/download`;

          if (err.response.status === 404) {
              specificError = `${action.charAt(0).toUpperCase() + action.slice(1)} endpoint not found (404). Check backend: ${endpointUrl}`;
          } else if (err.response.data instanceof Blob) {
              try {
                  const errorText = await err.response.data.text();
                  const errorJson = JSON.parse(errorText);
                  specificError = errorJson.message || `${action.charAt(0).toUpperCase() + action.slice(1)} failed with status ${err.response.status}.`;
              } catch (parseError) {
                  specificError = `${action.charAt(0).toUpperCase() + action.slice(1)} failed with status ${err.response.status}, and error details could not be parsed.`;
              }
          } else {
               specificError = err.response.data?.message || `${action.charAt(0).toUpperCase() + action.slice(1)} failed with status ${err.response.status}.`;
          }
      } else if (err.request) {
          specificError = `Network error: Could not ${action} report.`;
      } else {
          specificError = err.message || `An unexpected error occurred during report ${action}.`;
      }
      setError(specificError);
    } finally {
      setLoading(false);
    }
  };

  // Common TextField styles for DatePicker - Refined to match VuiInput more closely
  const textFieldStyles = {
    '& .MuiOutlinedInput-root': {
        backgroundColor: inputColors.backgroundColor,
        borderRadius: borderRadius.md,
        fontSize: size.sm, // Apply font size to root
        color: white.main, // Apply text color to root
        height: pxToRem(40), // Match VuiInput small height
        padding: `${pxToRem(8)} ${pxToRem(12)}`, // Apply padding to root
        '& .MuiOutlinedInput-input': {
            color: white.main, // Ensure input text color
            padding: '0 !important', // Remove default input padding
            height: '100%', // Ensure input fills height
            fontSize: size.sm, // Ensure font size on input itself
        },
        '& fieldset': {
            borderColor: inputColors.borderColor.main,
            borderWidth: borderWidth[1],
        },
        '&:hover fieldset': {
            borderColor: inputColors.borderColor.main,
        },
        '&.Mui-focused fieldset': {
            borderColor: info.main, // Use info color for focus border like VuiInput
            borderWidth: borderWidth[2], // Slightly thicker border on focus
        },
        '& .MuiSvgIcon-root': { // Calendar icon
            color: text.secondary,
        },
    },
    '& .MuiInputLabel-root': { // Style the label
        color: text.secondary,
        fontSize: size.sm,
        lineHeight: 1.5, // Adjust line height if needed
        transform: `translate(${pxToRem(12)}, ${pxToRem(10)}) scale(1)`, // Adjusted for VuiInput appearance
        '&.MuiInputLabel-shrink': {
             transform: `translate(${pxToRem(12)}, -${pxToRem(6)}) scale(0.75)`,
        },
        '&.Mui-focused': {
            color: info.main,
        },
    },
  };

  return (
    <Card>
      <VuiBox p={2}>
        <VuiTypography variant="lg" color="white" fontWeight="bold" mb={3}> {/* Increased margin-bottom */}
          Net Profit Report
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
                        sx={textFieldStyles}
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
                        sx={textFieldStyles}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            {/* Wrap buttons in a Grid container to control spacing and width */}
            <Grid container spacing={2}>
                <Grid item xs={6}> {/* Each button takes half the width */}
                    <VuiButton variant="outlined" color="info" onClick={() => handleGenerateReport('preview')} disabled={loading} fullWidth> {/* Add fullWidth */}
                        {loading ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null} Preview
                    </VuiButton>
                </Grid>
                <Grid item xs={6}> {/* Each button takes half the width */}
                    <VuiButton variant="contained" color="info" onClick={() => handleGenerateReport('download')} disabled={loading} fullWidth> {/* Add fullWidth */}
                        {loading ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null} Download
                    </VuiButton>
                </Grid>
            </Grid>
          </Grid>
        </Grid>
        {error && <VuiTypography variant="caption" color="error" mt={2}>{error}</VuiTypography>} {/* Added margin-top */}
      </VuiBox>
    </Card>
  );
}

export default NetProfitReportCard;
