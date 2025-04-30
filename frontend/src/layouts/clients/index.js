import { useState, useEffect, useCallback } from "react"; // Import useState and useEffect
import axios from "axios"; // Import axios for API calls
import axiosInstance from "api/axiosInstance";
import { getToken } from "utils/auth"; // Updated import path

import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon"; // Import Icon
import IconButton from "@mui/material/IconButton"; // Import IconButton
import Snackbar from '@mui/material/Snackbar'; // Import Snackbar
import Alert from '@mui/material/Alert'; // Import Alert for Snackbar content
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle'; // Add this import
import CircularProgress from '@mui/material/CircularProgress'; // For loading state

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiInput from "components/VuiInput";
import VuiButton from "components/VuiButton";
import GradientBorder from "examples/GradientBorder";
import VuiAlert from "components/VuiAlert"; // Import VuiAlert

// Vision UI Dashboard React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Table from "examples/Tables/Table"; // Keep Table import

// Authentication layout components
import CoverLayout from "layouts/admin/components/CoverLayout";

// Vision UI Dashboard assets
import radialGradient from "assets/theme/functions/radialGradient";
import linearGradient from "assets/theme/functions/linearGradient"; // Import linearGradient
import palette from "assets/theme/base/colors";
import borders from "assets/theme/base/borders";

// Images
import bgSignIn from "assets/images/signInImage.png";

// Function to format date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};


function ClientManagement() { // Renamed component
  const [clients, setClients] = useState([]); // Renamed state
  const [error, setError] = useState('');
  const [addError, setAddError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [newClientName, setNewClientName] = useState(''); // Renamed state
  const [newClientNic, setNewClientNic] = useState(''); // Renamed state
  const [newClientAddress, setNewClientAddress] = useState(''); // Renamed state
  const [newClientTelephone, setNewClientTelephone] = useState(''); // Added state for telephone
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  // --- Edit Dialog State ---
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null); // Client being edited
  const [editName, setEditName] = useState('');
  const [editNic, setEditNic] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editTelephone, setEditTelephone] = useState('');
  const [editError, setEditError] = useState('');
  const [isEditing, setIsEditing] = useState(false); // Loading state for edit
  // --- End Edit Dialog State ---


  // Fetch client list
  const fetchClients = useCallback(async () => { // Renamed function
      setIsLoading(true); // Start loading
      try {
          setError('');
          const token = getToken();
          if (!token) {
              setError("Authentication token not found.");
              setIsLoading(false); // Stop loading
              return;
          }
          // Updated API endpoint for clients
          const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/clients`, {
              headers: { Authorization: `Bearer ${token}` }
          });
          setClients(response.data); // Update clients state
      } catch (err) {
          console.error("Error fetching clients:", err); // Updated log message
          setError(err.response?.data?.message || "Failed to fetch clients."); // Updated error message
          setClients([]); // Clear clients on error
      } finally {
          setIsLoading(false); // Stop loading regardless of success or error
      }
  // Removed searchTerm dependency to fetch all clients initially
  }, []); // Empty dependency array means fetch only on mount or manual call

  useEffect(() => {
    fetchClients(); // Fetch clients on component mount
  }, [fetchClients]);

  // Handle Delete Action
  const handleDeleteClient = async (clientId) => { // Renamed parameter
    if (window.confirm(`Are you sure you want to delete client with ID: ${clientId}? This will also delete associated loans and payments.`)) { // Updated confirmation message
      try {
        setError('');
        setSuccessMessage('');
        const token = getToken();
        if (!token) {
            setError("Authentication token not found.");
            return;
        }
        // Updated API endpoint for deleting clients
        await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/clients/${clientId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        fetchClients(); // Refresh the client list
        setSuccessMessage('Client deleted successfully!'); // Updated success message
        setOpenSnackbar(true);
      } catch (err) {
        console.error(`Error deleting client ${clientId}:`, err); // Updated log message
        setError(err.response?.data?.message || "Failed to delete client."); // Updated error message
      }
    }
  };

  // Handle Add Client Form Submission
  const handleAddClient = async (event) => { // Renamed function
      event.preventDefault();
      setAddError('');
      setSuccessMessage('');

      // Updated validation for client fields (NIC is now required)
      if (!newClientName || !newClientNic || !newClientAddress || !newClientTelephone) { // Added !newClientNic
          setAddError("Name, NIC, Address, and Telephone fields are required."); // Updated error message
          return;
      }

      // Add basic NIC format validation (example: length check)
      if (newClientNic.length < 10) { // Example check, adjust as needed
          setAddError("Invalid NIC format. Please enter a valid NIC.");
          return;
      }
      // Add basic Telephone format validation (example: length check)
      if (newClientTelephone.length < 10) { // Example check, adjust as needed
          setAddError("Invalid telephone number format.");
          return;
      }


      try {
          const token = getToken();
          if (!token) {
              setAddError("Authentication token not found. Cannot add client."); // Updated error message
              return;
          }

          // Updated API endpoint and payload for adding clients
          const response = await axios.post(
              `${process.env.REACT_APP_API_BASE_URL}/api/clients/add`,
              {
                  name: newClientName,
                  nic: newClientNic,
                  address: newClientAddress,
                  telephone: newClientTelephone
              },
              { headers: { Authorization: `Bearer ${token}` } }
          );

          // Clear form fields
          setNewClientName('');
          setNewClientNic('');
          setNewClientAddress('');
          setNewClientTelephone('');
          fetchClients(); // Refresh the client list

          setSuccessMessage(response.data.message || 'Client added successfully!'); // Updated success message
          setOpenSnackbar(true);

      } catch (err) {
          console.error("Error adding client:", err); // Updated log message
          setAddError(err.response?.data?.message || "Failed to add client."); // Updated error message
      }
  };

  // --- Edit Dialog Handlers ---
  const handleOpenEditDialog = (client) => {
    setSelectedClient(client);
    setEditName(client.name);
    setEditNic(client.nic);
    setEditAddress(client.address);
    setEditTelephone(client.telephone);
    setEditError(''); // Clear previous errors
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedClient(null); // Clear selected client on close
    setIsEditing(false); // Reset loading state
  };

  const handleEditClient = async (event) => {
    event.preventDefault();
    setEditError('');
    setSuccessMessage('');
    setIsEditing(true); // Set loading state

    // Validation
    if (!editName || !editNic || !editAddress || !editTelephone) {
      setEditError("All fields (Name, NIC, Address, Telephone) are required.");
      setIsEditing(false);
      return;
    }
    if (editNic.length < 10) {
      setEditError("Invalid NIC format.");
      setIsEditing(false);
      return;
    }
    if (editTelephone.length < 10) {
      setEditError("Invalid telephone number format.");
      setIsEditing(false);
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        setEditError("Authentication token not found.");
        setIsEditing(false);
        return;
      }

      const payload = {
        name: editName,
        nic: editNic,
        address: editAddress,
        telephone: editTelephone,
      };

      const response = await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/api/clients/${selectedClient.client_id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage(response.data.message || 'Client updated successfully!');
      setOpenSnackbar(true);
      handleCloseEditDialog(); // Close dialog on success
      fetchClients(); // Refresh the list

    } catch (err) {
      console.error("Error updating client:", err);
      setEditError(err.response?.data?.message || "Failed to update client.");
    } finally {
        setIsEditing(false); // Reset loading state
    }
  };
  // --- End Edit Dialog Handlers ---


  // Filter clients based on search term (name, NIC, or telephone)
  const filteredClients = clients.filter(client =>
      (client.name && client.name.toLowerCase().includes(searchTerm.toLowerCase())) || // Corrected property to 'name'
      (client.nic && client.nic.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.telephone && client.telephone.toLowerCase().includes(searchTerm.toLowerCase()))
  );


  // Define table columns for clients
  const clientColumns = [ // Renamed variable
    { name: "id", align: "left", width: "5%" },
    { name: "name", align: "left" },
    { name: "nic", align: "left" }, // Added NIC
    { name: "address", align: "left" }, // Added Address
    { name: "telephone", align: "center" }, // Added Telephone
    { name: "action", align: "center", width: "10%" },
  ];

  // Map FILTERED data to table rows for clients
  const clientRows = filteredClients.map(client => ({ // Renamed variable and used client properties
    id: (
      <VuiTypography variant="caption" color="white" fontWeight="medium">
        {client.client_id}
      </VuiTypography>
    ),
    name: ( // Use name from the data
      <VuiTypography variant="caption" color="white" fontWeight="medium">
        {client.name}
      </VuiTypography>
    ),
    nic: ( // Added NIC row data
      <VuiTypography variant="caption" color="text" fontWeight="medium">
        {client.nic}
      </VuiTypography>
    ),
    address: ( // Added Address row data
      <VuiTypography variant="caption" color="text" fontWeight="medium">
        {client.address}
      </VuiTypography>
    ),
    telephone: ( // Added Telephone row data
      <VuiTypography variant="caption" color="text" fontWeight="medium">
        {client.telephone}
      </VuiTypography>
    ),
    action: (
      <VuiBox display="flex" justifyContent="center" alignItems="center">
        {/* Edit button - Updated onClick */}
        <IconButton size="small" color="info" sx={{ margin: '0 5px' }} onClick={() => handleOpenEditDialog(client)} >
          <Icon>edit</Icon>
        </IconButton>
        {/* Delete button */}
        <IconButton
            size="small"
            color="error"
            sx={{ margin: '0 5px' }}
            onClick={() => handleDeleteClient(client.client_id)} // Use client_id
        >
          <Icon>delete</Icon>
        </IconButton>
      </VuiBox>
    ),
  }));

  // Handle closing the Snackbar
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      {/* --- Add Client Form --- */}
      <CoverLayout
        title="Add new client" // Updated title
        color="white"
        image={bgSignIn}
      >
        {/* Updated onSubmit handler */}
        <VuiBox component="form" role="form" onSubmit={handleAddClient}>
          {/* Display Add Client Error */}
          {addError && (
              <VuiBox mb={2}>
                  <VuiAlert color="error" dismissible onDismiss={() => setAddError('')}>
                      <VuiTypography variant="caption" color="white">
                          {addError}
                      </VuiTypography>
                  </VuiAlert>
              </VuiBox>
          )}
          {/* Success Message is now handled by Snackbar */}

          {/* Name Input */}
           <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Name
              </VuiTypography>
            </VuiBox>
            <GradientBorder
              minWidth="100%"
              padding="1px"
              borderRadius={borders.borderRadius.lg}
              backgroundImage={radialGradient(
                palette.gradients.borderLight.main,
                palette.gradients.borderLight.state,
                palette.gradients.borderLight.angle
              )}
            >
              <VuiInput
                type="text"
                placeholder="Enter client's name..." // Updated placeholder
                fontWeight="500"
                value={newClientName} // Bind value
                onChange={(e) => setNewClientName(e.target.value)} // Update state
                sx={({ typography: { size } }) => ({
                  fontSize: size.sm,
                })}
              />
            </GradientBorder>
          </VuiBox>
          {/* NIC Input */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                NIC
              </VuiTypography>
            </VuiBox>
            <GradientBorder
              minWidth="100%"
              padding="1px"
              borderRadius={borders.borderRadius.lg}
              backgroundImage={radialGradient(
                palette.gradients.borderLight.main,
                palette.gradients.borderLight.state,
                palette.gradients.borderLight.angle
              )}
            >
              <VuiInput
                type="text"
                placeholder="Enter client's NIC..." // Updated placeholder
                fontWeight="500"
                value={newClientNic} // Bind value
                onChange={(e) => setNewClientNic(e.target.value)} // Update state
                sx={({ typography: { size } }) => ({
                  fontSize: size.sm,
                })}
              />
            </GradientBorder>
          </VuiBox>
          {/* Address Input */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Address
              </VuiTypography>
            </VuiBox>
            <GradientBorder
              minWidth="100%"
              padding="1px"
              borderRadius={borders.borderRadius.lg}
              backgroundImage={radialGradient(
                palette.gradients.borderLight.main,
                palette.gradients.borderLight.state,
                palette.gradients.borderLight.angle
              )}
            >
              <VuiInput
                type="text"
                placeholder="Enter client's address..." // Updated placeholder
                fontWeight="500"
                value={newClientAddress} // Bind value
                onChange={(e) => setNewClientAddress(e.target.value)} // Update state
                sx={({ typography: { size } }) => ({
                  fontSize: size.sm,
                })}
              />
            </GradientBorder>
          </VuiBox>
          {/* Telephone number Input */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Telephone number
              </VuiTypography>
            </VuiBox>
            <GradientBorder
              minWidth="100%"
              padding="1px"
              borderRadius={borders.borderRadius.lg}
              backgroundImage={radialGradient(
                palette.gradients.borderLight.main,
                palette.gradients.borderLight.state,
                palette.gradients.borderLight.angle
              )}
            >
              <VuiInput
                type="tel" // Changed type to tel
                placeholder="Enter client's telephone number..." // Updated placeholder
                fontWeight="500"
                value={newClientTelephone} // Bind value
                onChange={(e) => setNewClientTelephone(e.target.value)} // Update state
                sx={({ typography: { size } }) => ({
                  fontSize: size.sm,
                })}
              />
            </GradientBorder>
          </VuiBox>
          {/* Submit Button */}
          <VuiBox mt={4} mb={1}>
            <VuiButton type="submit" color="info" fullWidth>
              Add new client {/* Updated button text */}
            </VuiButton>
          </VuiBox>
        </VuiBox>
      </CoverLayout>

      {/* --- Client List Table --- */}
      <VuiBox py={3}>
        {/* Remove the Success Message VuiAlert from here */}

        <VuiBox mb={3}>
          <Card>
            <VuiBox display="flex" justifyContent="space-between" alignItems="center" mb="22px" px={2} pt={2}>
              <VuiTypography variant="lg" color="white">
                Client list {/* Updated title */}
              </VuiTypography>
              {/* Search Input */}
              <VuiBox sx={{ width: '250px' }}>
                 <VuiInput
                    placeholder="Search by Name, NIC, or Phone..." // Updated placeholder
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={{ component: "search", direction: "left" }}
                    sx={({ typography: { size } }) => ({
                        fontSize: size.sm,
                    })}
                 />
              </VuiBox>
            </VuiBox>
            {/* Conditional Rendering for Table Content */}
            {isLoading ? (
                <VuiBox p={3} textAlign="center">
                    <CircularProgress color="info" />
                    <VuiTypography variant="h6" color="text" mt={2}>Loading clients...</VuiTypography>
                </VuiBox>
            ) : error ? (
                <VuiBox mb={2} p={2} mx={2} sx={{ backgroundColor: 'rgba(255, 0, 0, 0.1)', borderRadius: 'md' }}>
                    <VuiTypography variant="caption" color="error">
                        {error}
                    </VuiTypography>
                </VuiBox>
            ) : filteredClients.length === 0 ? ( // Use filteredClients here
                <VuiBox p={3} textAlign="center">
                    <VuiTypography variant="h6" color="text">
                        {searchTerm ? "No clients match your search." : "No clients found."}
                    </VuiTypography>
                </VuiBox>
            ) : (
                <VuiBox
                  sx={{
                    "& th": {
                      borderBottom: ({ borders: { borderWidth }, palette: { grey } }) =>
                        `${borderWidth[1]} solid ${grey[700]}`,
                    },
                    "& .MuiTableRow-root:not(:last-child)": {
                      "& td": {
                        borderBottom: ({ borders: { borderWidth }, palette: { grey } }) =>
                          `${borderWidth[1]} solid ${grey[700]}`,
                      },
                    },
                  }}
                >
                  {/* Use the dynamic client columns and rows */}
                  <Table columns={clientColumns} rows={clientRows} />
                </VuiBox>
            )}
          </Card>
        </VuiBox>
        {/* Remove the second table if it was for projects */}
      </VuiBox>

      {/* --- Edit Client Dialog --- */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        PaperProps={{
            component: 'form', // Make the Dialog Paper a form element
            onSubmit: handleEditClient, // Handle submission here
             sx: { // Style the dialog paper
                backgroundColor: 'rgba(20, 20, 30, 0.95)', // Dark background
                backdropFilter: 'blur(5px)',
                border: `1px solid ${palette.grey[700]}`,
                borderRadius: borders.borderRadius.lg,
                color: 'white', // Default text color
             }
        }}
      >
        <DialogTitle sx={{ color: 'white', borderBottom: `1px solid ${palette.grey[700]}` }}>
            Edit Client Details
        </DialogTitle>
        <DialogContent sx={{ paddingTop: '20px !important' }}> {/* Add padding top */}
          {editError && (
            <Alert severity="error" sx={{ mb: 2, width: '100%', '.MuiAlert-message': { color: 'white' } }} onClose={() => setEditError('')}>
              {editError}
            </Alert>
          )}
          {/* Display Client ID (Read-only) */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Client ID
              </VuiTypography>
            </VuiBox>
            <GradientBorder
              minWidth="100%"
              padding="1px"
              borderRadius={borders.borderRadius.lg}
              backgroundImage={linearGradient(palette.gradients.primary.main, palette.gradients.primary.state, palette.gradients.primary.deg)}
            >
              <VuiInput
                placeholder="Client ID"
                value={selectedClient?.client_id || ''}
                disabled
                sx={({ typography: { size }, palette: { text, grey, white, background }, borders: { borderRadius } }) => ({
                  fontSize: size.sm,
                  color: grey[500],
                  WebkitTextFillColor: grey[500],
                  '.MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: grey[500],
                    color: grey[500],
                    backgroundColor: 'transparent !important',
                  },
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { border: "none" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { border: "none" },
                  '& .MuiInputBase-root': {
                     backgroundColor: 'rgba(15, 21, 53, 0.4) !important',
                     backdropFilter: 'blur(2px)',
                     borderRadius: borderRadius.lg,
                     height: '40px',
                     pl: '12px',
                     pr: '12px',
                  }
                })}
              />
            </GradientBorder>
          </VuiBox>

          {/* Edit Name */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Name
              </VuiTypography>
            </VuiBox>
            <GradientBorder
              minWidth="100%"
              borderRadius={borders.borderRadius.lg}
              padding="1px"
              backgroundImage={radialGradient(
                palette.gradients.borderLight.main,
                palette.gradients.borderLight.state,
                palette.gradients.borderLight.angle
              )}
            >
              <VuiInput
                placeholder="Enter client's name..."
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                sx={({ typography: { size } }) => ({ fontSize: size.sm })}
              />
            </GradientBorder>
          </VuiBox>

          {/* Edit NIC */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                NIC
              </VuiTypography>
            </VuiBox>
            <GradientBorder
              minWidth="100%"
              borderRadius={borders.borderRadius.lg}
              padding="1px"
              backgroundImage={radialGradient(
                palette.gradients.borderLight.main,
                palette.gradients.borderLight.state,
                palette.gradients.borderLight.angle
              )}
            >
              <VuiInput
                placeholder="Enter client's NIC..."
                value={editNic}
                onChange={(e) => setEditNic(e.target.value)}
                required
                sx={({ typography: { size } }) => ({ fontSize: size.sm })}
              />
            </GradientBorder>
          </VuiBox>

          {/* Edit Address */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Address
              </VuiTypography>
            </VuiBox>
            <GradientBorder
              minWidth="100%"
              borderRadius={borders.borderRadius.lg}
              padding="1px"
              backgroundImage={radialGradient(
                palette.gradients.borderLight.main,
                palette.gradients.borderLight.state,
                palette.gradients.borderLight.angle
              )}
            >
              <VuiInput
                placeholder="Enter client's address..."
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                required
                sx={({ typography: { size } }) => ({ fontSize: size.sm })}
              />
            </GradientBorder>
          </VuiBox>

          {/* Edit Telephone */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Telephone
              </VuiTypography>
            </VuiBox>
            <GradientBorder
              minWidth="100%"
              borderRadius={borders.borderRadius.lg}
              padding="1px"
              backgroundImage={radialGradient(
                palette.gradients.borderLight.main,
                palette.gradients.borderLight.state,
                palette.gradients.borderLight.angle
              )}
            >
              <VuiInput
                type="tel"
                placeholder="Enter client's telephone..."
                value={editTelephone}
                onChange={(e) => setEditTelephone(e.target.value)}
                required
                sx={({ typography: { size } }) => ({ fontSize: size.sm })}
              />
            </GradientBorder>
          </VuiBox>

        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${palette.grey[700]}`, padding: '16px 24px' }}>
          <VuiButton onClick={handleCloseEditDialog} color="secondary" variant="outlined" sx={{ mr: 1 }}>
            Cancel
          </VuiButton>
          <VuiButton type="submit" color="info" variant="contained" disabled={isEditing}>
            {isEditing ? <CircularProgress size={20} color="inherit" /> : "Save Changes"}
          </VuiButton>
        </DialogActions>
      </Dialog>
      {/* --- End Edit Client Dialog --- */}


      {/* Snackbar for Success Messages */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

export default ClientManagement; // Export with the new name
