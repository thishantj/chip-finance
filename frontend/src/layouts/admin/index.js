import { useState, useEffect, useCallback } from "react"; // Import useState and useEffect
import axiosInstance from "api/axiosInstance"; // Import the instance
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
import palette from "assets/theme/base/colors";
import borders from "assets/theme/base/borders";
import linearGradient from "assets/theme/functions/linearGradient"; // Import linearGradient for primary gradient

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

  // --- Edit Dialog State ---
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null); // Admin being edited
  const [editName, setEditName] = useState('');
  const [editCurrentPassword, setEditCurrentPassword] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [editError, setEditError] = useState('');
  const [isEditing, setIsEditing] = useState(false); // Loading state for edit
  // --- End Edit Dialog State ---


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
  const fetchAdmins = useCallback(async () => { // Wrap in useCallback
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
  }, []); // Add dependency if needed, e.g., if triggered by other actions

  useEffect(() => {
    fetchAdmins(); // Fetch admins on component mount
  }, [fetchAdmins]); // Add fetchAdmins to dependency array

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

  // --- Edit Dialog Handlers ---
  const handleOpenEditDialog = (admin) => {
    setSelectedAdmin(admin);
    setEditName(admin.admin_name);
    setEditCurrentPassword(''); // Clear password fields on open
    setEditNewPassword('');
    setEditConfirmPassword('');
    setEditError(''); // Clear previous errors
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedAdmin(null); // Clear selected admin on close
    setIsEditing(false); // Reset loading state
  };

  const handleEditAdmin = async (event) => {
    event.preventDefault();
    setEditError('');
    setSuccessMessage('');
    setIsEditing(true); // Set loading state

    // Validation
    if (!editName) {
      setEditError("Admin name cannot be empty.");
      setIsEditing(false);
      return;
    }
    if (editNewPassword && editNewPassword !== editConfirmPassword) {
      setEditError("New passwords do not match.");
      setIsEditing(false);
      return;
    }
    // Add more password validation if needed (e.g., length)
    if (editNewPassword && editNewPassword.length < 6) {
        setEditError("New password must be at least 6 characters long.");
        setIsEditing(false);
        return;
    }
    // Require current password only if new password is being set
    if (editNewPassword && !editCurrentPassword) {
        setEditError("Current password is required to set a new password.");
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
        // Only include password fields if a new password is being set
        ...(editNewPassword && {
            currentPassword: editCurrentPassword,
            newPassword: editNewPassword,
            confirmNewPassword: editConfirmPassword, // Send confirmation for backend check too
        })
      };

      const response = await axiosInstance.put(
        `/api/admins/update/${selectedAdmin.admin_id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage(response.data.message || 'Admin updated successfully!');
      setOpenSnackbar(true);
      handleCloseEditDialog(); // Close dialog on success
      fetchAdmins(); // Refresh the list

    } catch (err) {
      console.error("Error updating admin:", err);
      setEditError(err.response?.data?.message || "Failed to update admin.");
    } finally {
        setIsEditing(false); // Reset loading state
    }
  };
  // --- End Edit Dialog Handlers ---


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
        <IconButton size="small" color="info" sx={{ margin: '0 5px' }} onClick={() => handleOpenEditDialog(admin)} >
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

      {/* --- Edit Admin Dialog --- */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        PaperProps={{
            component: 'form', // Make the Dialog Paper a form element
            onSubmit: handleEditAdmin, // Handle submission here
             sx: { // Style the dialog paper
                backgroundColor: 'rgba(20, 20, 30, 0.95)', // Dark background
                backdropFilter: 'blur(5px)',
                border: `1px solid ${palette.grey[700]}`,
                borderRadius: borders.borderRadius.lg,
                color: 'white', // Default text color for the paper
             }
        }}
      >
        {/* Ensure DialogTitle text color is white */}
        <DialogTitle sx={{ color: 'white', borderBottom: `1px solid ${palette.grey[700]}` }}>
            Edit Admin User
        </DialogTitle>
        <DialogContent sx={{ paddingTop: '20px !important' }}> {/* Add padding top */}
          {editError && (
            <Alert severity="error" sx={{ mb: 2, width: '100%', '.MuiAlert-message': { color: 'white' } }} onClose={() => setEditError('')}>
              {editError}
            </Alert>
          )}
          {/* Display ID (Read-only) */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Admin ID
              </VuiTypography>
            </VuiBox>
            {/* Use GradientBorder with primary gradient */}
            <GradientBorder
              minWidth="100%"
              padding="1px"
              borderRadius={borders.borderRadius.lg}
              // Use linearGradient for primary gradient
              backgroundImage={linearGradient(palette.gradients.primary.main, palette.gradients.primary.state, palette.gradients.primary.deg)}
            >
              <VuiInput
                placeholder="Admin ID"
                value={selectedAdmin?.admin_id || ''}
                disabled
                sx={({ typography: { size }, palette: { text, grey, white, background }, borders: { borderRadius } }) => ({ // Destructure more theme elements
                  fontSize: size.sm,
                  // Use a slightly brighter grey or white with opacity for disabled text
                  color: grey[500], // Example: Brighter grey
                  WebkitTextFillColor: grey[500], // For Webkit browsers
                  '.MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: grey[500], // Ensure consistency
                    color: grey[500],
                    backgroundColor: 'transparent !important', // Crucial for showing gradient
                  },
                  // Remove VuiInput's own border/outline
                  "& .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                  // Style the root input container for transparency and matching radius
                  '& .MuiInputBase-root': {
                     backgroundColor: 'rgba(15, 21, 53, 0.4) !important', // Semi-transparent dark background inside border
                     backdropFilter: 'blur(2px)', // Add a slight blur effect inside
                     borderRadius: borderRadius.lg, // Match GradientBorder radius
                     height: '40px', // Ensure consistent height if needed
                     pl: '12px', // Add some padding if text is too close to edge
                     pr: '12px',
                  }
                })}
              />
            </GradientBorder>
          </VuiBox>

          {/* Display Username (Read-only) */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Username
              </VuiTypography>
            </VuiBox>
             {/* Use GradientBorder with primary gradient */}
            <GradientBorder
              minWidth="100%"
              padding="1px"
              borderRadius={borders.borderRadius.lg}
              // Use linearGradient for primary gradient
              backgroundImage={linearGradient(palette.gradients.primary.main, palette.gradients.primary.state, palette.gradients.primary.deg)}
            >
              <VuiInput
                placeholder="Username"
                value={selectedAdmin?.username || ''}
                disabled
                sx={({ typography: { size }, palette: { text, grey, white, background }, borders: { borderRadius } }) => ({ // Destructure more theme elements
                  fontSize: size.sm,
                  // Use a slightly brighter grey or white with opacity for disabled text
                  color: grey[500], // Example: Brighter grey
                  WebkitTextFillColor: grey[500], // For Webkit browsers
                  '.MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: grey[500], // Ensure consistency
                    color: grey[500],
                    backgroundColor: 'transparent !important', // Crucial for showing gradient
                  },
                  // Remove VuiInput's own border/outline
                  "& .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                  // Style the root input container for transparency and matching radius
                  '& .MuiInputBase-root': {
                     backgroundColor: 'rgba(15, 21, 53, 0.4) !important', // Semi-transparent dark background inside border
                     backdropFilter: 'blur(2px)', // Add a slight blur effect inside
                     borderRadius: borderRadius.lg, // Match GradientBorder radius
                     height: '40px', // Ensure consistent height if needed
                     pl: '12px', // Add some padding if text is too close to edge
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
                placeholder="Enter admin's name..."
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                sx={({ typography: { size } }) => ({
                  fontSize: size.sm,
                })}
              />
            </GradientBorder>
          </VuiBox>

          {/* Current Password */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Current Password (only if changing)
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
                placeholder="Enter current password..."
                value={editCurrentPassword}
                onChange={(e) => setEditCurrentPassword(e.target.value)}
                sx={({ typography: { size } }) => ({
                  fontSize: size.sm,
                })}
              />
            </GradientBorder>
          </VuiBox>

          {/* New Password */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                New Password (leave blank to keep current)
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
                placeholder="Enter new password..."
                value={editNewPassword}
                onChange={(e) => setEditNewPassword(e.target.value)}
                sx={({ typography: { size } }) => ({
                  fontSize: size.sm,
                })}
              />
            </GradientBorder>
          </VuiBox>

          {/* Confirm New Password */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Confirm New Password
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
                placeholder="Confirm new password..."
                value={editConfirmPassword}
                onChange={(e) => setEditConfirmPassword(e.target.value)}
                disabled={!editNewPassword} // Disable if new password is blank
                sx={({ typography: { size } }) => ({
                  fontSize: size.sm,
                   // Style disabled state to match read-only fields
                  '.MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: palette.text.secondary,
                    color: palette.text.secondary,
                    backgroundColor: 'transparent !important', // Ensure background is transparent
                  },
                })}
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
      {/* --- End Edit Admin Dialog --- */}

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
