import { useState, useEffect } from "react"; // Import useState

// react-router-dom components
import { useLocation, NavLink, useHistory } from "react-router-dom"; // Import useHistory

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Icon from "@mui/material/Icon";
import ListItemButton from "@mui/material/ListItemButton"; // For logout button
import ListItemIcon from "@mui/material/ListItemIcon"; // Ensure ListItemIcon is imported

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";

// Vision UI Dashboard React example components
import SidenavCollapse from "examples/Sidenav/SidenavCollapse";

// Custom styles for the Sidenav
import SidenavRoot from "examples/Sidenav/SidenavRoot";
import sidenavLogoLabel from "examples/Sidenav/styles/sidenav";

// Vision UI Dashboard React context
import { useVisionUIController, setMiniSidenav, setTransparentSidenav } from "context";

// Vision UI Dashboard React icons
import SimmmpleLogo from "examples/Icons/SimmmpleLogo";

// function Sidenav({ color, brand, brandName, routes, ...rest }) {
function Sidenav({ color, brandName, routes, ...rest }) {
  const [controller, dispatch] = useVisionUIController();
  const { miniSidenav, transparentSidenav } = controller;
  const location = useLocation();
  const { pathname } = location;
  // Use a state object to manage the open state of multiple collapses
  // Initialize with 'billing' set to true to make it open by default
  const [openCollapse, setOpenCollapse] = useState({ billing: true });

  // Function to toggle collapse state
  const handleCollapseToggle = (key) => {
    setOpenCollapse((prevOpenCollapse) => ({
      ...prevOpenCollapse,
      [key]: !prevOpenCollapse[key],
    }));
  };

  // Function to check if a route or its children are active
  const isRouteActive = (routeToCheck, currentPathname) => {
    // Check if the route itself matches the pathname
    if (routeToCheck.route === currentPathname) {
      return true;
    }
    // If it's a collapsible parent, recursively check its children
    // Ensure routeToCheck.collapse exists and is an array before calling some()
    if (routeToCheck.collapse && Array.isArray(routeToCheck.collapse) && !routeToCheck.noCollapse) {
      return routeToCheck.collapse.some(childRoute => isRouteActive(childRoute, currentPathname));
    }
    // Otherwise, it's not active
    return false;
  };

  const history = useHistory(); // Get history object

  const closeSidenav = () => setMiniSidenav(dispatch, true);

  // --- Logout Handler ---
  const handleLogout = () => {
    // Clear authentication token from both storages
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken"); // Log token clearing

    // Optionally: Dispatch action to update global auth state if using context/redux
    // Optionally: Make API call to backend logout endpoint if needed (though less critical for JWT)
    // axiosInstance.post('/api/admins/logout').catch(err => console.error("Backend logout call failed:", err));

    // Redirect to sign-in page using full page reload
    window.location.href = '/authentication/sign-in'; // Force full page reload
  };
  // --- End Logout Handler ---

  useEffect(() => {
    // A function that sets the mini state of the sidenav.
    function handleMiniSidenav() {
      setMiniSidenav(dispatch, window.innerWidth < 1200);
    }

    /** 
     The event listener that's calling the handleMiniSidenav function when resizing the window.
    */
    window.addEventListener("resize", handleMiniSidenav);

    // Call the handleMiniSidenav function to set the state with the initial value.
    handleMiniSidenav();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleMiniSidenav);
  }, [dispatch, location]);

  useEffect(() => {
    if (window.innerWidth < 1) {
      setTransparentSidenav(dispatch, true);
    }
  }, []);

  // Render all the routes from the routes.js (All the visible items on the Sidenav)
  const renderRoutes = (routesToRender) =>
    routesToRender
      .filter((route) => route.name || route.type === "divider" || route.type === "title") // Keep dividers and titles
      .map(({ type, name, icon, title, noCollapse, key, route, href, collapse }) => {
        let returnValue;
        const currentRouteObject = { type, name, icon, title, noCollapse, key, route, href, collapse };

        // Determine active state for THIS specific item (exact match)
        const isActive = route === pathname;

        // Determine if the parent branch contains the active route (used for opening)
        // const isBranchActive = isRouteActive(currentRouteObject, pathname); // Keep for potential future use if needed


        if (type === "collapse") {
          // Check if collapse exists and is an array
          const hasCollapse = collapse && Array.isArray(collapse);

          if (hasCollapse && !noCollapse) { // This is a parent collapse item
            returnValue = (
              <div key={key}> {/* Wrap in div for proper key handling */}
                <SidenavCollapse
                  color={color}
                  key={key}
                  name={name}
                  icon={icon}
                  // Parent is never visually 'active' itself, only open
                  active={false}
                  noCollapse={false} // Explicitly set to false for parent
                  open={!!openCollapse[key]} // Control open state
                  onClick={() => handleCollapseToggle(key)} // Add onClick handler
                >
                  {/* Recursively render children inside MUI Collapse */}
                  {renderRoutes(collapse)}
                </SidenavCollapse>
              </div>
            );
          } else { // This is a regular item or a child item within a collapse (leaf node)
            returnValue = href ? (
              <Link
                href={href}
                key={key}
                target="_blank"
                rel="noreferrer"
                sx={{ textDecoration: "none" }}
              >
                <SidenavCollapse
                  color={color}
                  name={name}
                  icon={icon}
                  // Leaf is active only if it's an exact match
                  active={isActive}
                  noCollapse={noCollapse} // Use the noCollapse prop from routes.js
                />
              </Link>
            ) : (
              <NavLink to={route} key={key}>
                <SidenavCollapse
                  color={color}
                  key={key}
                  name={name}
                  icon={icon}
                  // Leaf is active only if it's an exact match
                  active={isActive}
                  noCollapse={noCollapse} // Use the noCollapse prop from routes.js
                />
              </NavLink>
            );
          }
        } else if (type === "title") {
          returnValue = (
            <VuiTypography
              key={key}
              color="white"
              display="block"
              variant="caption"
              fontWeight="bold"
              textTransform="uppercase"
              pl={3}
              mt={2}
              mb={1}
              ml={1}
            >
              {title}
            </VuiTypography>
          );
        } else if (type === "divider") {
          returnValue = <Divider light key={key} />;
        } else if (type === "action" && key === "logout") {
          // --- Handle Logout Action (Revised) ---
          returnValue = (
            <ListItemButton
              onClick={handleLogout} // Attach directly to ListItemButton
              key={key}
              sx={{
                width: "100%", // Let SidenavCollapse handle padding/margin within button
                py: 0, // Remove padding from button, let Collapse handle it
                my: 0.3,
                // mx: 2, // Remove margin from button
                // borderRadius: 'lg', // Remove border radius from button
                display: 'block', // Allow Collapse to fill width
                // alignItems: 'center', // Remove alignment from button
                // color: 'white', // Remove color from button
                '&:hover': { // Add hover effect if desired
                  backgroundColor: 'rgba(255, 255, 255, 0.05)', // Subtle hover
                }
              }}
            >
              {/* Render SidenavCollapse inside for consistent styling */}
              <SidenavCollapse
                // Pass necessary props to SidenavCollapse
                name={name}
                icon={icon}
                active={false} // Logout is never active
                noCollapse={true} // It's an action, not collapsible
                // miniSidenav={miniSidenav} // Pass miniSidenav if SidenavCollapse uses it for styling text/icon
              />
            </ListItemButton>
          );
          // --- End Handle Logout Action (Revised) ---
        }

        return returnValue;
      });

  return (
    <SidenavRoot {...rest} variant="permanent" ownerState={{ transparentSidenav, miniSidenav }}>
      <VuiBox
        pt={3.5}
        pb={0.5}
        px={4}
        textAlign="center"
        sx={{
          overflow: "unset !important",
        }}
      >
        <VuiBox
          display={{ xs: "block", xl: "none" }}
          position="absolute"
          top={0}
          right={0}
          p={1.625}
          onClick={closeSidenav}
          sx={{ cursor: "pointer" }}
        >
          <VuiTypography variant="h6" color="text">
            <Icon sx={{ fontWeight: "bold" }}>close</Icon>
          </VuiTypography>
        </VuiBox>
        <VuiBox component={NavLink} to="/" display="flex" alignItems="center">
          <VuiBox
            sx={
              ((theme) => sidenavLogoLabel(theme, { miniSidenav }),
              {
                display: "flex",
                alignItems: "center",
                margin: "0 auto",
              })
            }
          >
            <VuiBox
              display="flex"
              sx={
                ((theme) => sidenavLogoLabel(theme, { miniSidenav, transparentSidenav }),
                {
                  mr: miniSidenav || (miniSidenav && transparentSidenav) ? 0 : 1,
                })
              }
            >
              <SimmmpleLogo size="24px" />
            </VuiBox>
            <VuiTypography
              variant="button"
              textGradient={true}
              color="logo"
              fontSize={14}
              letterSpacing={2}
              fontWeight="medium"
              sx={
                ((theme) => sidenavLogoLabel(theme, { miniSidenav, transparentSidenav }),
                {
                  opacity: miniSidenav || (miniSidenav && transparentSidenav) ? 0 : 1,
                  maxWidth: miniSidenav || (miniSidenav && transparentSidenav) ? 0 : "100%",
                  margin: "0 auto",
                })
              }
            >
              {brandName}
            </VuiTypography>
          </VuiBox>
        </VuiBox>
      </VuiBox>
      <Divider light />
      <List sx={{ mb: 2 /* Add margin bottom to push logout down */ }}>{renderRoutes(routes)}</List>
    </SidenavRoot>
  );
}

// Setting default values for the props of Sidenav
Sidenav.defaultProps = {
  color: "info",
  // brand: "",
};

// Typechecking props for the Sidenav
Sidenav.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]),
  // brand: PropTypes.string,
  brandName: PropTypes.string.isRequired,
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default Sidenav;
