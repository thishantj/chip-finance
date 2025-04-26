import { useState, useEffect } from "react";

// react-router components
import { useLocation, Link, useHistory } from "react-router-dom"; // Import useHistory

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @material-ui core components
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem"; // Import MenuItem
import Icon from "@mui/material/Icon";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiInput from "components/VuiInput";

// Vision UI Dashboard React example components
import Breadcrumbs from "examples/Breadcrumbs";
// import NotificationItem from "examples/Items/NotificationItem";

// Custom styles for DashboardNavbar
import {
  navbar,
  navbarContainer,
  navbarRow,
  navbarIconButton,
  navbarMobileMenu,
} from "examples/Navbars/DashboardNavbar/styles";

// Vision UI Dashboard React context
import {
  useVisionUIController,
  setTransparentNavbar,
  setMiniSidenav,
  setOpenConfigurator,
} from "context";

function DashboardNavbar({ absolute, light, isMini }) {
  const [navbarType, setNavbarType] = useState();
  const [controller, dispatch] = useVisionUIController();
  const { miniSidenav, transparentNavbar, fixedNavbar, openConfigurator } = controller;
  const [openMenu, setOpenMenu] = useState(false);
  const route = useLocation().pathname.split("/").slice(1);
  const history = useHistory(); // Get history object

  useEffect(() => {
    // Setting the navbar type
    if (fixedNavbar) {
      setNavbarType("sticky");
    } else {
      setNavbarType("static");
    }

    // A function that sets the transparent state of the navbar.
    function handleTransparentNavbar() {
      setTransparentNavbar(dispatch, (fixedNavbar && window.scrollY === 0) || !fixedNavbar);
    }

    /** 
     The event listener that's calling the handleTransparentNavbar function when 
     scrolling the window.
    */
    window.addEventListener("scroll", handleTransparentNavbar);

    // Call the handleTransparentNavbar function to set the state with the initial value.
    handleTransparentNavbar();

    // Remove event listener on cleanup
    return () => window.removeEventListener("scroll", handleTransparentNavbar);
  }, [dispatch, fixedNavbar]);

  const handleMiniSidenav = () => setMiniSidenav(dispatch, !miniSidenav);
  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);
  const handleOpenMenu = (event) => setOpenMenu(event.currentTarget);
  const handleCloseMenu = () => setOpenMenu(false);

  // --- Add Logout Handler ---
  const handleLogout = async () => {
    // Clear token from both storages
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");

    // Redirect to sign-in page using full page reload
    window.location.href = '/authentication/sign-in'; // Force full page reload
  };
  // --- End Add Logout Handler ---

  // Function to render the logout menu item (or wherever your logout button is)
  const renderLogoutMenu = () => (
    <MenuItem onClick={handleLogout}> {/* Attach the handler here */}
      <VuiTypography variant="button" fontWeight="medium" color="text">
        Log Out
      </VuiTypography>
    </MenuItem>
    // ... other menu items ...
  );

  return (
    <AppBar
      position={absolute ? "absolute" : navbarType}
      color="inherit"
      sx={(theme) => navbar(theme, { transparentNavbar, absolute, light })}
    >
      <Toolbar sx={(theme) => navbarContainer(theme)}>
        {/* Main Row */}
        <VuiBox sx={(theme) => navbarRow(theme, { isMini })}>
          {/* Left Group: Hamburger + Breadcrumbs */}
          <VuiBox sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Hamburger Icon (conditionally visible via sx) */}
            <IconButton
              size="small"
              color="inherit"
              sx={navbarMobileMenu} // This style controls visibility based on breakpoints
              onClick={handleMiniSidenav}
            >
              <Icon className={"text-white"}>{miniSidenav ? "menu_open" : "menu"}</Icon>
            </IconButton>
            {/* Breadcrumbs */}
            <Breadcrumbs icon="home" title={route[route.length - 1]} route={route} light={light} />
          </VuiBox>
        </VuiBox>
      </Toolbar>
    </AppBar>
  );
}

// Setting default values for the props of DashboardNavbar
DashboardNavbar.defaultProps = {
  absolute: false,
  light: false,
  isMini: false,
};

// Typechecking props for the DashboardNavbar
DashboardNavbar.propTypes = {
  absolute: PropTypes.bool,
  light: PropTypes.bool,
  isMini: PropTypes.bool,
};

export default DashboardNavbar;
