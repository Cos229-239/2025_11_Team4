import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';

const UserProtectedRoute = ({ children }) => {
  const { token } = useUserAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default UserProtectedRoute;

