import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Route, Switch, Redirect, useLocation, useHistory } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Icon from "@mui/material/Icon";
import VuiBox from "components/VuiBox";
import Sidenav from "examples/Sidenav";
import Configurator from "examples/Configurator";
import theme from "assets/theme";
import themeRTL from "assets/theme/theme-rtl";
import rtlPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import routes from "routes";
import { useVisionUIController, setOpenConfigurator, setLayout } from "context";
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute
import Dashboard from 'layouts/dashboard'; // Example Dashboard component
import SignIn from 'layouts/authentication/sign-in';

const handleLogout = (history) => {
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('authToken');
  if (history) {
    history.push('/authentication/sign-in');
  } else {
    window.location.href = '/authentication/sign-in';
  }
};

export default function App() {
  const [controller, dispatch] = useVisionUIController();
  const { miniSidenav, direction, layout, openConfigurator, sidenavColor } = controller;
  const [onMouseEnter, setOnMouseEnter] = useState(false);
  const [rtlCache, setRtlCache] = useState(null);
  const { pathname } = useLocation();
  const history = useHistory();
  const inactivityTimer = useRef(null);
  const inactivityTimeoutDuration = 60 * 60 * 1000; // 1 hour in milliseconds

  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (token) {
        console.log('User inactive, logging out.');
        handleLogout(history);
      }
    }, inactivityTimeoutDuration);
  }, [history, inactivityTimeoutDuration]);

  useEffect(() => {
    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });
    resetInactivityTimer();
    return () => {
      clearTimeout(inactivityTimer.current);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [resetInactivityTimer]);

  const isAuthenticated = useMemo(() => {
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    return !!token;
  }, [pathname]);

  useMemo(() => {
    const cacheRtl = createCache({
      key: "rtl",
      stylisPlugins: [rtlPlugin],
    });
    setRtlCache(cacheRtl);
  }, []);

  const handleOnMouseEnter = () => {
    if (miniSidenav && !onMouseEnter) {
      setOnMouseEnter(true);
    }
  };

  const handleOnMouseLeave = () => {
    if (onMouseEnter) {
      setOnMouseLeave(false);
    }
  };

  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);

  useEffect(() => {
    document.body.setAttribute("dir", direction);
  }, [direction]);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
  }, [pathname]);

  const getRoutes = (allRoutes) =>
    allRoutes.map((route) => {
      if (route.collapse) {
        return getRoutes(route.collapse);
      }
      if (route.route) {
        return route.component ? <Route exact path={route.route} component={route.component} key={route.key} /> : null;
      }
      return null;
    });

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

  useEffect(() => {
    setLayout(dispatch, pathname.includes("/authentication/") ? "page" : "dashboard");
  }, [pathname, dispatch]);

  return direction === "rtl" ? (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={themeRTL}>
        <CssBaseline />
      </ThemeProvider>
    </CacheProvider>
  ) : (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {layout === "dashboard" && isAuthenticated && (
        <>
          <Sidenav
            color={sidenavColor}
            brand=""
            brandName="SUN PIVOTAL"
            routes={routes}
            onMouseEnter={handleOnMouseEnter}
            onMouseLeave={handleOnMouseLeave}
          />
          <Configurator />
          {configsButton}
        </>
      )}
      {layout === "vr" && <Configurator />}
      <Switch>
        <Route path="/authentication/sign-in" component={SignIn} />
        <ProtectedRoute path="/dashboard" component={Dashboard} />
        {getRoutes(routes)}
        <Redirect from="/billing" to="/billing/loans" />
        <Redirect from="*" to="/dashboard" />
      </Switch>
    </ThemeProvider>
  );
}
