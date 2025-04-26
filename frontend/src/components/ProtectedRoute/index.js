import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { getToken } from 'utils/auth'; // Updated import path

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
