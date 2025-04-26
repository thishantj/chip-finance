import { useState, useEffect } from "react"; // Import useState and useEffect
import axiosInstance from "api/axiosInstance"; // Import the instance

import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon"; // Import Icon
import IconButton from "@mui/material/IconButton"; // Import IconButton
import Snackbar from '@mui/material/Snackbar'; // Import Snackbar
import Alert from '@mui/material/Alert'; // Import Alert for Snackbar content

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


function AdminManagement() { // Renamed component for clarity
  // const { columns, rows } = authorsTableData; // Remove usage of hardcoded data
  // const { columns: prCols, rows: prRows } = projectsTableData; // Remove if not used

  const [admins, setAdmins] = useState([]);
  const [currentAdminId, setCurrentAdminId] = useState(null);
  const [error, setError] = useState(''); // State for error messages
  const [addError, setAddError] = useState(''); // Separate error state for add form
  const [successMessage, setSuccessMessage] = useState(''); // State for success alert message
  const [searchTerm, setSearchTerm] = useState(''); // State for search term
  const [newName, setNewName] = useState(''); // State for add form: name
  const [newUsername, setNewUsername] = useState(''); // State for add form: username
  const [newPassword, setNewPassword] = useState(''); // State for add form: password
  const [openSnackbar, setOpenSnackbar] = useState(false); // State for Snackbar visibility

  // Function to get token (checks both storages)
  const getToken = () => {
      return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  };


  // Fetch current admin ID
  useEffect(() => {
    const fetchCurrentAdmin = async () => {
      try {
        const token = getToken(); // Use helper function
        if (!token) {
            setError("Authentication token not found."); // Keep this error for table
            return;
        }
        const response = await axiosInstance.get(`/api/admins/check-auth`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.isAuthenticated && response.data.admin) {
          setCurrentAdminId(response.data.admin.id);
        } else {
            setError("Failed to verify current user.");
        }
      } catch (err) {
        console.error("Error fetching current admin:", err);
        setError(err.response?.data?.message || "Error fetching current admin info.");
      }
    };
    fetchCurrentAdmin();
  }, []);


  // Fetch admin list
  const fetchAdmins = async () => {
      try {
          setError(''); // Clear previous table errors
          const token = getToken(); // Use helper function
          if (!token) {
              setError("Authentication token not found.");
              return;
          }
          const response = await axiosInstance.get(`/api/admins`, {
              headers: { Authorization: `Bearer ${token}` }
          });
          setAdmins(response.data);
      } catch (err) {
          console.error("Error fetching admins:", err);
          setError(err.response?.data?.message || "Failed to fetch admins.");
          setAdmins([]); // Clear admins on error
      }
  };

  useEffect(() => {
    fetchAdmins(); // Fetch admins on component mount
  }, []); // Empty dependency array ensures this runs only once on mount

  // Handle Delete Action
  const handleDelete = async (adminId) => {
    if (window.confirm(`Are you sure you want to delete admin with ID: ${adminId}?`)) {
      try {
        setError('');
        setSuccessMessage(''); // Clear success message on new action
        const token = getToken(); // Use helper function
        if (!token) {
            setError("Authentication token not found.");
            return;
        }
        await axiosInstance.delete(`/api/admins/${adminId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        // Refresh the list after successful deletion
        fetchAdmins();
        // Optionally set a success message for delete
        setSuccessMessage('Admin deleted successfully!');
        setOpenSnackbar(true); // Open Snackbar
      } catch (err) {
        console.error(`Error deleting admin ${adminId}:`, err);
        setError(err.response?.data?.message || "Failed to delete admin.");
      }
    }
  };

  // Handle Add Admin Form Submission
  const handleAddAdmin = async (event) => {
      event.preventDefault(); // Prevent default form submission
      setAddError(''); // Clear previous add errors
      setSuccessMessage(''); // Clear previous success message

      if (!newName || !newUsername || !newPassword) {
          setAddError("All fields (Name, Username, Password) are required.");
          return;
      }

      try {
          const token = getToken(); // Use helper function
          if (!token) {
              setAddError("Authentication token not found. Cannot add admin.");
              return;
          }

          const response = await axiosInstance.post( // Store response
              `/api/admins/add`,
              { name: newName, username: newUsername, password: newPassword },
              { headers: { Authorization: `Bearer ${token}` } }
          );

          // Clear form and refresh list on success
          setNewName('');
          setNewUsername('');
          setNewPassword('');
          fetchAdmins(); // Refresh the admin list

          // Show success Snackbar
          setSuccessMessage(response.data.message || 'Admin added successfully!');
          setOpenSnackbar(true); // Open Snackbar

      } catch (err) {
          console.error("Error adding admin:", err);
          setAddError(err.response?.data?.message || "Failed to add admin.");
      }
  };


  // Filter admins based on search term
  const filteredAdmins = admins.filter(admin =>
      admin.admin_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.username.toLowerCase().includes(searchTerm.toLowerCase())
  );


  // Define table columns
  const adminColumns = [
    { name: "id", align: "left", width: "5%" },
    { name: "name", align: "left" },
    { name: "username", align: "left" },
    { name: "created", align: "center" },
    { name: "action", align: "center", width: "10%" },
  ];

  // Map FILTERED data to table rows
  const adminRows = filteredAdmins.map(admin => ({ // Use filteredAdmins here
    id: (
      <VuiTypography variant="caption" color="white" fontWeight="medium">
        {admin.admin_id}
      </VuiTypography>
    ),
    name: (
      <VuiTypography variant="caption" color="white" fontWeight="medium">
        {admin.admin_name}
      </VuiTypography>
    ),
    username: (
      <VuiTypography variant="caption" color="text" fontWeight="medium">
        {admin.username}
      </VuiTypography>
    ),
    created: (
      <VuiTypography variant="caption" color="text" fontWeight="medium">
        {formatDate(admin.created_at)}
      </VuiTypography>
    ),
    action: (
      <VuiBox display="flex" justifyContent="center" alignItems="center">
        <IconButton size="small" color="info" sx={{ margin: '0 5px' }} onClick={() => alert(`Edit admin ${admin.admin_id}`)} /* Add Edit Handler */ >
          <Icon>edit</Icon>
        </IconButton>
        <IconButton
            size="small"
            color="error"
            sx={{ margin: '0 5px' }}
            onClick={() => handleDelete(admin.admin_id)}
            disabled={admin.admin_id === currentAdminId} // Disable if it's the current user
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
      {/* --- Add Admin Form --- */}
      <CoverLayout
        title="Add new admin user"
        color="white"
        image={bgSignIn}
      >
        {/* Add onSubmit handler to the form */}
        <VuiBox component="form" role="form" onSubmit={handleAddAdmin}>
          {/* Display Add Admin Error */}
          {addError && (
              <VuiBox mb={2}>
                  {/* Use VuiAlert for errors too if desired */}
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
                placeholder="Enter admin's name..."
                fontWeight="500"
                value={newName} // Bind value
                onChange={(e) => setNewName(e.target.value)} // Update state
                sx={({ typography: { size } }) => ({
                  fontSize: size.sm,
                })}
              />
            </GradientBorder>
          </VuiBox>
          {/* Username Input */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Username
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
                placeholder="Enter admin's username..."
                fontWeight="500"
                value={newUsername} // Bind value
                onChange={(e) => setNewUsername(e.target.value)} // Update state
                sx={({ typography: { size } }) => ({
                  fontSize: size.sm,
                })}
              />
            </GradientBorder>
          </VuiBox>
          {/* Password Input */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Password
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
                type="password"
                placeholder="Enter password..."
                value={newPassword} // Bind value
                onChange={(e) => setNewPassword(e.target.value)} // Update state
                sx={({ typography: { size } }) => ({
                  fontSize: size.sm,
                })}
              />
            </GradientBorder>
          </VuiBox>
          {/* Submit Button */}
          <VuiBox mt={4} mb={1}>
            {/* Change to type="submit" */}
            <VuiButton type="submit" color="info" fullWidth>
              Add new admin user
            </VuiButton>
          </VuiBox>
        </VuiBox>
      </CoverLayout>

      {/* --- Admin List Table --- */}
      <VuiBox py={3}>
        {/* Remove the Success Message VuiAlert from here */}
        {/* {successMessage && ( ... )} */}

        <VuiBox mb={3}>
          <Card>
            <VuiBox display="flex" justifyContent="space-between" alignItems="center" mb="22px" px={2} pt={2}>
              <VuiTypography variant="lg" color="white">
                Admin user list
              </VuiTypography>
              {/* Search Input */}
              <VuiBox sx={{ width: '250px' }}>
                 <VuiInput
                    placeholder="Search by Name or Username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={{ component: "search", direction: "left" }}
                    sx={({ typography: { size } }) => ({
                        fontSize: size.sm,
                    })}
                 />
              </VuiBox>
            </VuiBox>
            {/* Display Table Error */}
            {error && (
                <VuiBox mb={2} p={2} mx={2} sx={{ backgroundColor: 'rgba(255, 0, 0, 0.1)', borderRadius: 'md' }}>
                    <VuiTypography variant="caption" color="error">
                        {error}
                    </VuiTypography>
                </VuiBox>
            )}
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
              {/* Use the dynamic columns and rows */}
              <Table columns={adminColumns} rows={adminRows} />
            </VuiBox>
          </Card>
        </VuiBox>
        {/* Remove the second table if it was for projects */}
        {/* <Card> ... </Card> */}
      </VuiBox>
      {/* Snackbar for Success Messages */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000} // Adjust duration as needed
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }} // Position top-right
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }} // Ensure it's above other elements like modals if any
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

export default AdminManagement; // Export with the new name
