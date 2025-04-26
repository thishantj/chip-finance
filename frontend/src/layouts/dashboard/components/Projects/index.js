import { useState, useEffect, useMemo } from "react";
import axiosInstance from "api/axiosInstance";
import { getToken } from "utils/auth";

// @mui material components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon"; // Keep Icon if used elsewhere, otherwise remove
import IconButton from "@mui/material/IconButton"; // Keep IconButton if used elsewhere, otherwise remove
import CircularProgress from "@mui/material/CircularProgress";
import VuiButton from "components/VuiButton"; // Import VuiButton

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiInput from "components/VuiInput";
import VuiProgress from "components/VuiProgress";
import VuiAlert from "components/VuiAlert";

// Vision UI Dashboard Materail-UI example components
import Table from "examples/Tables/Table";

// Import theme hook to access theme properties like palette and borders
import { useTheme } from "@mui/material/styles";

// Define formatCurrency locally
const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "N/A";
    return parseFloat(amount).toLocaleString("en-LK", { // Use en-LK for Sri Lankan Rupees
        style: "currency",
        currency: "LKR", // Set currency to LKR
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// Function to calculate completion percentage based on aggregated amounts
const calculateCompletion = (totalDueSum, remainingBalanceSum) => {
  if (totalDueSum === null || totalDueSum === undefined || totalDueSum <= 0) {
    return 0; // Avoid division by zero or invalid calculation
  }
  const paidAmountSum = totalDueSum - (remainingBalanceSum ?? 0);
  return Math.max(0, Math.min(100, (paidAmountSum / totalDueSum) * 100)); // Clamp between 0 and 100
};


function Projects() {
  const [allLoansData, setAllLoansData] = useState([]); // Store raw loan data
  const [clientsData, setClientsData] = useState([]); // Store processed client-aggregated data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const theme = useTheme(); // Get theme object
  const { palette, borders } = theme; // Destructure theme properties
  const { grey, background } = palette; // Destructure from palette
  const { borderWidth, borderRadius } = borders; // Destructure from borders

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) {
        setError("Authentication required.");
        setLoading(false);
        return;
      }

      try {
        // Fetch all loans (now includes client_telephone)
        const response = await axiosInstance.get("/api/loans", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllLoansData(response.data || []); // Store raw data
      } catch (err) {
        console.error("Error fetching loans data:", err);
        setError(err.response?.data?.message || "Failed to load loans data.");
        setAllLoansData([]);
        setClientsData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Process loan data into client-aggregated data whenever raw loan data changes
  useEffect(() => {
    if (!allLoansData || allLoansData.length === 0) {
        setClientsData([]);
        return;
    }

    const clientMap = new Map();

    allLoansData.forEach(loan => {
        if (!clientMap.has(loan.client_id)) {
            clientMap.set(loan.client_id, {
                client_id: loan.client_id,
                name: loan.client_name,
                nic: loan.client_nic,
                telephone: loan.client_telephone, // Get telephone
                loan_count: 0,
                total_due_sum: 0,
                remaining_balance_sum: 0,
            });
        }

        const clientEntry = clientMap.get(loan.client_id);
        clientEntry.loan_count += 1;
        clientEntry.total_due_sum += parseFloat(loan.total_amount_due || 0);
        clientEntry.remaining_balance_sum += parseFloat(loan.remaining_balance || 0);
    });

    // Calculate completion for each client
    const processedClients = Array.from(clientMap.values()).map(client => ({
        ...client,
        completion_percentage: calculateCompletion(client.total_due_sum, client.remaining_balance_sum)
    }));

    setClientsData(processedClients);

  }, [allLoansData]);


  // Filter data based on search term (searching processed client data)
  const filteredData = useMemo(() => {
    if (!searchTerm) {
      return clientsData;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    // Filter based on available fields: name, nic, telephone
    return clientsData.filter(
      (client) =>
        client.name?.toLowerCase().includes(lowerCaseSearchTerm) ||
        client.nic?.toLowerCase().includes(lowerCaseSearchTerm) ||
        client.telephone?.toLowerCase().includes(lowerCaseSearchTerm) // Added telephone filtering
    );
  }, [clientsData, searchTerm]);


  // Define table columns - Add Telephone, Loan Count, Completion
  const columns = [
    { name: "client", label: "Client", align: "left" },
    { name: "nic", label: "NIC", align: "left" },
    { name: "telephone", label: "Telephone", align: "left" }, // Added
    { name: "loan_count", label: "Loans", align: "center" }, // Added
    { name: "remaining", label: "Total Remaining", align: "right" }, // Renamed for clarity
    { name: "completion", label: "Completion", align: "center" }, // Added
    { name: "action", label: "Action", align: "center" },
  ];

  // Map filtered data to table rows - Use processed client data
  const rows = filteredData.map((client) => {
    return {
      client: (
        <VuiTypography variant="button" color="white" fontWeight="medium">
          {client.name || "N/A"}
        </VuiTypography>
      ),
      nic: (
        <VuiTypography variant="caption" color="text">
          {client.nic || "N/A"}
        </VuiTypography>
      ),
      telephone: ( // Added
        <VuiTypography variant="caption" color="text">
          {client.telephone || "N/A"}
        </VuiTypography>
      ),
      loan_count: ( // Added
        <VuiTypography variant="caption" color="white" fontWeight="medium">
          {client.loan_count}
        </VuiTypography>
      ),
      remaining: (
        <VuiTypography variant="button" color="white" fontWeight="medium">
          {/* Display sum of remaining balances */}
          {formatCurrency(client.remaining_balance_sum) ?? "N/A"}
        </VuiTypography>
      ),
      completion: ( // Added
        <VuiBox width="8rem" textAlign="left">
          <VuiTypography color="white" variant="button" fontWeight="bold">
            {client.completion_percentage.toFixed(0)}%
          </VuiTypography>
          <VuiProgress value={client.completion_percentage} color="info" label={false} sx={{ background: "#2D2E5F" }} />
        </VuiBox>
      ),
      action: ( // Changed to VuiButton
        <VuiButton
            variant="contained"
            color="info"
            size="small"
            onClick={() => alert(`Generate summary report for ${client.name} (Client ID: ${client.client_id})`)}
            sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }} // Adjust padding/fontSize if needed
        >
            Generate client summary
        </VuiButton>
      ),
    };
  });

  return (
    <Card>
      <VuiBox display="flex" justifyContent="space-between" alignItems="center" mb="22px" px={2} pt={2}>
        <VuiTypography variant="lg" color="white">
          Client Loan Overview
        </VuiTypography>
      </VuiBox>

      {/* Search Input - Update placeholder */}
      <VuiBox px={1} mb={2}>
        <VuiInput
          placeholder="Search by Name, NIC, or Telephone..." // Updated placeholder
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={{ component: "search", direction: "left" }}
        />
      </VuiBox>

      {/* Conditional Rendering for Table Content */}
      {loading ? (
        <VuiBox p={3} textAlign="center">
          <CircularProgress color="inherit" size={40} />
          <VuiTypography variant="h6" color="text" mt={2}>Loading client data...</VuiTypography>
        </VuiBox>
      ) : error ? (
        <VuiBox mb={2} p={2} mx={2}>
          <VuiAlert color="error" dismissible onClose={() => setError(null)}>
            <VuiTypography variant="caption" color="white">
              {error}
            </VuiTypography>
          </VuiAlert>
        </VuiBox>
      ) : (
        <VuiBox
          sx={{
            // Set a max height calculated roughly based on 10 rows + header
            // Adjust the multiplier (e.g., 50px) based on your actual row height
            maxHeight: "550px", // Adjust this value as needed for ~10 rows + header
            overflowY: "auto", // Enable vertical scrolling
            "& th": {
              borderBottom: `${borderWidth[1]} solid ${grey[700]}`,
              position: "sticky", // Make header sticky
              top: 0, // Stick to the top
              backgroundColor: background.card, // Match card background
              zIndex: 2, // Ensure header is above scrolling content
            },
            "& .MuiTableRow-root:not(:last-child)": {
              "& td": {
                borderBottom: `${borderWidth[1]} solid ${grey[700]}`,
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
               borderRadius: borderRadius.md, // Use theme border radius
            },
            '&::-webkit-scrollbar-thumb:hover': {
               backgroundColor: grey[500], // Lighter thumb on hover
            }
          }}
        >
          <Table columns={columns} rows={rows} />
           {/* Message if no results found after filtering */}
           {filteredData.length === 0 && searchTerm && (
             <VuiTypography variant="caption" color="text" textAlign="center" p={2}>
               No clients found matching "{searchTerm}".
             </VuiTypography>
           )}
           {/* Message if no data initially */}
           {clientsData.length === 0 && !searchTerm && !loading && !error && ( // Check loading/error state
             <VuiTypography variant="caption" color="text" textAlign="center" p={2}>
               No client loan data available.
             </VuiTypography>
           )}
        </VuiBox>
      )}
    </Card>
  );
}

export default Projects;
