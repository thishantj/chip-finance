import { useState, useEffect, useMemo } from "react";

// react-router components
import { Route, Switch, Redirect, useLocation } from "react-router-dom";

// @mui material components
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Icon from "@mui/material/Icon";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";

// Vision UI Dashboard React example components
import Sidenav from "examples/Sidenav";
import Configurator from "examples/Configurator";

// Vision UI Dashboard React themes
import theme from "assets/theme";
import themeRTL from "assets/theme/theme-rtl";

// RTL plugins
import rtlPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";

// Vision UI Dashboard React routes
import routes from "routes";

// Vision UI Dashboard React context
import { useVisionUIController, setOpenConfigurator, setLayout } from "context";

// Additional layout/component imports
// Remove these direct imports as they are likely handled by the routes file
// import AdminManagement from "layouts/admin";
// import ClientManagement from "layouts/clients";

export default function App() {
  const [controller, dispatch] = useVisionUIController();
  const { miniSidenav, direction, layout, openConfigurator, sidenavColor } = controller;
  const [onMouseEnter, setOnMouseEnter] = useState(false);
  const [rtlCache, setRtlCache] = useState(null);
  const { pathname } = useLocation();

  // --- Authentication Check ---
  // Check for token in both localStorage (Remember Me) and sessionStorage
  const isAuthenticated = useMemo(() => {
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    // Optionally: Add token validation logic here if needed (e.g., check expiry)
    return !!token;
  }, [pathname]); // Re-check on path change, e.g., after login/logout redirect
  // --- End Authentication Check ---


  // Cache for the rtl
  useMemo(() => {
    const cacheRtl = createCache({
      key: "rtl",
      stylisPlugins: [rtlPlugin],
    });

    setRtlCache(cacheRtl);
  }, []);

  // Open sidenav when mouse enter on mini sidenav
  const handleOnMouseEnter = () => {
    if (miniSidenav && !onMouseEnter) {
      // setMiniSidenav(dispatch, false); // Temporarily disable auto-expand on hover if not desired
      setOnMouseEnter(true);
    }
  };

  // Close sidenav when mouse leave mini sidenav
  const handleOnMouseLeave = () => {
    if (onMouseEnter) {
      // setMiniSidenav(dispatch, true); // Temporarily disable auto-collapse on leave if not desired
      setOnMouseLeave(false);
    }
  };

  // Change the openConfigurator state
  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);

  // Setting the dir attribute for the body element
  useEffect(() => {
    document.body.setAttribute("dir", direction);
  }, [direction]);

  // Setting page scroll to 0 when changing the route
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
  }, [pathname]);

  // --- Route Rendering Logic ---
  const getRoutes = (allRoutes) =>
    allRoutes.map((route) => {
      if (route.collapse) {
        return getRoutes(route.collapse);
      }

      if (route.route) {
        // Ensure the component exists before creating the route
        // Use exact prop for Route in v5
        return route.component ? <Route exact path={route.route} component={route.component} key={route.key} /> : null;
      }

      return null;
    });
  // --- End Route Rendering Logic ---


  const configsButton = (
    <VuiBox
      display="flex"
      justifyContent="center"
      alignItems="center"
      width="3.5rem"
      height="3.5rem"
      bgColor="info"
      shadow="sm"
      borderRadius="50%"
      position="fixed"
      right="2rem"
      bottom="2rem"
      zIndex={99}
      color="white"
      sx={{ cursor: "pointer" }}
      onClick={handleConfiguratorOpen}
    >
      <Icon fontSize="default" color="inherit">
        settings
      </Icon>
    </VuiBox>
  );

  // Determine layout based on pathname
  useEffect(() => {
    setLayout(dispatch, pathname.includes("/authentication/") ? "page" : "dashboard");
  }, [pathname, dispatch]);


  return direction === "rtl" ? (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={themeRTL}>
        <CssBaseline />
        {/* RTL Content */}
        {/* ... similar structure as LTR below, adapt if needed ... */}
      </ThemeProvider>
    </CacheProvider>
  ) : (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Conditionally render Sidenav only for dashboard layout and if authenticated */}
      {layout === "dashboard" && isAuthenticated && (
        <>
          <Sidenav
            color={sidenavColor}
            brand="" // Or your brand image
            brandName="VISION" // Your brand name
            routes={routes} // Pass routes to Sidenav
            onMouseEnter={handleOnMouseEnter}
            onMouseLeave={handleOnMouseLeave}
          />
          <Configurator />
          {configsButton}
        </>
      )}
      {layout === "vr" && <Configurator />} {/* Keep VR Configurator if needed */}
      {/* Replace Routes with Switch and Navigate with Redirect */}
      <Switch>
        {getRoutes(routes)} {/* Render routes from routes.js */}
        {/* The routes for AdminManagement and ClientManagement should be defined in routes.js */}
        {/* <Route path="/clients" component={ClientManagement} /> */}
        {/* <Route path="/admin-users" component={AdminManagement} /> */}
        <Redirect from="/billing" to="/billing/loans" /> {/* Redirect for default Billing page */}
        <Redirect from="*" to="/dashboard" /> {/* Use Redirect for catch-all */}
      </Switch>
    </ThemeProvider>
  );
}
