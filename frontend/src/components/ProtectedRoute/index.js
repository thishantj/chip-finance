import React from 'react';
import { Route, Redirect } from 'react-router-dom';

// Helper function to get token
const getToken = () => {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
};

const ProtectedRoute = ({ component: Component, ...rest }) => {
  const isAuthenticated = !!getToken(); // Check if token exists

  return (
    <Route
      {...rest}
      render={(props) =>
        isAuthenticated ? (
          <Component {...props} />
        ) : (
          <Redirect to="/authentication/sign-in" />
        )
      }
    />
  );
};

export default ProtectedRoute;
