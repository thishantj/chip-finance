import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
import axiosInstance from "api/axiosInstance"; // Assuming axiosInstance is correctly imported
import { getToken } from "utils/auth"; // Updated import path

// @mui material components
import Grid from "@mui/material/Grid";
import { Card, CircularProgress, Stack } from "@mui/material"; // Add CircularProgress and Stack

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiAlert from "components/VuiAlert"; // Import VuiAlert if not already present

// Vision UI Dashboard React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MiniStatisticsCard from "examples/Cards/StatisticsCards/MiniStatisticsCard";
import linearGradient from "assets/theme/functions/linearGradient";

// Vision UI Dashboard React base styles
import colors from "assets/theme/base/colors";

// Dashboard layout components
import Projects from "layouts/dashboard/components/Projects";
import OrderOverview from "layouts/dashboard/components/OrderOverview";
import ClientSummaryReportCard from "layouts/dashboard/components/ClientSummaryReportCard";
import NetProfitReportCard from "layouts/dashboard/components/NetProfitReportCard";

// React icons
import { IoWallet } from "react-icons/io5";
import { IoDocumentText } from "react-icons/io5";
import { FaUserPlus } from "react-icons/fa"; // Import user icon

// Function to format currency (ensure this is defined or imported)
const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "N/A";
    // Adjust formatting as needed
    return parseFloat(amount).toLocaleString("en-LK", {
        style: "currency",
        currency: "LKR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};


function Dashboard() {
  const { gradients } = colors;
  const { cardContent } = gradients;
  const defaultChartData = { labels: [], datasets: [] }; // Default empty structure

  // State for summary data
  const [weeklyPayments, setWeeklyPayments] = useState(null);
  const [weeklyPaymentsPercentage, setWeeklyPaymentsPercentage] = useState(null); // New state
  const [monthlyPayments, setMonthlyPayments] = useState(null);
  const [monthlyPaymentsPercentage, setMonthlyPaymentsPercentage] = useState(null); // New state
  const [monthlyLoansCount, setMonthlyLoansCount] = useState(null);
  const [monthlyLoansPercentage, setMonthlyLoansPercentage] = useState(null); // New state
  const [monthlyNewClientsCount, setMonthlyNewClientsCount] = useState(null); // New state for count
  const [monthlyNewClientsPercentage, setMonthlyNewClientsPercentage] = useState(null); // New state for percentage
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Keep this one for errors
  const [adminName, setAdminName] = useState('');

  // Fetch Admin Info
  const fetchAdminInfo = useCallback(async () => { // Wrap in useCallback
    // setError(''); // Clear previous errors - Let summary fetch handle its errors
    try {
      const token = getToken(); // Use the imported helper
      if (!token) {
        // setError("Authentication token not found. Please log in again."); // Avoid overwriting summary errors
        console.error("Authentication token not found for admin info fetch.");
        return;
      }
      const response = await axiosInstance.get('/api/admins/check-auth', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Assuming response.data contains { admin_name: '...' }
      if (response.data && response.data.admin_name) { // Check if data and admin_name exist
        setAdminName(response.data.admin_name);
      } else {
         // Handle case where admin_name might be missing
         console.warn("Admin name not found in auth check response.");
         setAdminName(''); // Set to empty string or default
      }
    } catch (err) {
      console.error("Error fetching admin info:", err);
      // setError(err.response?.data?.message || "Failed to load admin information."); // Avoid overwriting summary errors
    }
  }, []); // Add empty dependency array for useCallback

  // Fetch Dashboard Summaries and Admin Info
  useEffect(() => {
    fetchAdminInfo(); // Call fetchAdminInfo

    const fetchSummaries = async () => {
      setLoading(true); // Set loading true at the start of fetch
      setError(null); // Clear previous errors
      const token = getToken();
      if (!token) {
        setError("Authentication required.");
        setLoading(false);
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };
        // Add the new client summary endpoint to Promise.all
        const [weeklyRes, monthlyRes, loansRes, clientsRes] = await Promise.all([
          axiosInstance.get("/api/dashboard/summary/weekly-payments", { headers }),
          axiosInstance.get("/api/dashboard/summary/monthly-payments", { headers }),
          axiosInstance.get("/api/dashboard/summary/monthly-loans-count", { headers }),
          axiosInstance.get("/api/dashboard/summary/monthly-new-clients", { headers }), // Fetch new client data
        ]);

        // Use optional chaining and nullish coalescing for safety
        setWeeklyPayments(weeklyRes?.data?.totalAmount ?? null);
        setWeeklyPaymentsPercentage(weeklyRes?.data?.percentageChange ?? null); // Set weekly percentage
        setMonthlyPayments(monthlyRes?.data?.totalAmount ?? null);
        setMonthlyPaymentsPercentage(monthlyRes?.data?.percentageChange ?? null); // Set monthly percentage
        setMonthlyLoansCount(loansRes?.data?.count ?? null);
        setMonthlyLoansPercentage(loansRes?.data?.percentageChange ?? null); // Set loans percentage
        setMonthlyNewClientsCount(clientsRes?.data?.count ?? null); // Set new client count
        setMonthlyNewClientsPercentage(clientsRes?.data?.percentageChange ?? null); // Set new client percentage

      } catch (err) {
        console.error("Error fetching dashboard summaries:", err);
        setError(err.response?.data?.message || "Failed to load dashboard data.");
        // Reset data states on error
        setWeeklyPayments(null);
        setWeeklyPaymentsPercentage(null); // Reset on error
        setMonthlyPayments(null);
        setMonthlyPaymentsPercentage(null); // Reset on error
        setMonthlyLoansCount(null);
        setMonthlyLoansPercentage(null); // Reset on error
        setMonthlyNewClientsCount(null); // Reset new client count on error
        setMonthlyNewClientsPercentage(null); // Reset new client percentage on error
      } finally {
        setLoading(false);
      }
    };

    fetchSummaries();
  }, [fetchAdminInfo]); // Add fetchAdminInfo to dependency array

  const renderStatisticCard = (title, count, icon, formatFn, percentage) => { // Add percentage parameter
      if (loading) {
          return <CircularProgress size={20} color="inherit" />;
      }
      // Use the 'error' state variable from the component scope, don't redeclare
      if (error && count === null) { // Only show card-specific error if its data failed (is null)
          return <VuiTypography variant="caption" color="error">Error</VuiTypography>;
      }

      // Determine percentage color and text
      let percentageColor = "secondary"; // Default or grey
      let percentageText = "";
      if (percentage !== null && !isNaN(percentage)) {
          percentageColor = percentage >= 0 ? "success" : "error";
          percentageText = `${percentage >= 0 ? '+' : ''}${percentage}%`;
      }


      return (
          <MiniStatisticsCard
              title={{ text: title, fontWeight: "regular" }}
              count={formatFn ? formatFn(count) : (count ?? 'N/A')}
              percentage={{ color: percentageColor, text: percentageText }} // Use dynamic percentage
              icon={{ color: "info", component: icon }} // Icon passed as prop
          />
      );
  };


  return (
    <DashboardLayout>
      <DashboardNavbar />
      {/* Display the main error state if needed */}
      {error && !loading && ( // Display error only if not loading and error exists
        <VuiBox mb={2}>
          {/* Use VuiAlert for better presentation */}
          <VuiAlert color="error" dismissible onClose={() => setError(null)}>
             <VuiTypography color="white" variant="body2">{error}</VuiTypography>
          </VuiAlert>
        </VuiBox>
      )}
      <VuiBox py={3}>
        {/* Welcome message or other components can use adminName */}
        {adminName && (
           <VuiTypography variant="h5" color="white" mb={3}>Welcome back, {adminName}!</VuiTypography>
        )}
        {/* Removed redundant error display here as it's handled above */}
        <VuiBox mb={3}>
          <Grid container spacing={3}>
            {/* 1. This Week's Payments */}
            <Grid item xs={12} md={6} xl={3}>
              {renderStatisticCard(
                "This week's payments",
                weeklyPayments,
                <IoWallet size="22px" color="white" />,
                formatCurrency,
                weeklyPaymentsPercentage // Pass percentage
              )}
            </Grid>
            {/* 2. This Month's Payments */}
            <Grid item xs={12} md={6} xl={3}>
              {renderStatisticCard(
                "This month's payments",
                monthlyPayments,
                <IoWallet size="22px" color="white" />, // Using wallet icon again
                formatCurrency,
                monthlyPaymentsPercentage // Pass percentage
              )}
            </Grid>
            {/* 3. This Month's Loans Issued */}
            <Grid item xs={12} md={6} xl={3}>
              {renderStatisticCard(
                "This month's loans issued",
                monthlyLoansCount,
                <IoDocumentText size="22px" color="white" />, // Using document icon
                null, // No format function needed for count
                monthlyLoansPercentage // Pass percentage
              )}
            </Grid>
            {/* 4. New Customers This Month */}
            <Grid item xs={12} md={6} xl={3}>
              {renderStatisticCard(
                "New customers this month", // Updated title
                monthlyNewClientsCount, // Use new client count state
                <FaUserPlus size="20px" color="white" />, // Use user icon
                null, // No format function needed for count
                monthlyNewClientsPercentage // Pass the percentage state
              )}
            </Grid>
          </Grid>
        </VuiBox>
        <Grid container spacing={3} direction="row" justifyContent="center" alignItems="stretch">
          <Grid item xs={12} md={6} lg={8}>
            <Projects />
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <Stack spacing={3}>
              <ClientSummaryReportCard />
              <NetProfitReportCard />
              <OrderOverview />
            </Stack>
          </Grid>
        </Grid>
      </VuiBox>
    </DashboardLayout>
  );
}

export default Dashboard;

// Define or import lineChartOptionsDashboard and barChartOptionsDashboard if they are used
const lineChartOptionsDashboard = { /* ... options ... */ };
const barChartOptionsDashboard = { /* ... options ... */ };
