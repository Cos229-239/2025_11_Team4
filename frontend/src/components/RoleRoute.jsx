import { Navigate, useLocation } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';

const RoleRoute = ({ children, allowedRoles }) => {
  const { user, token } = useUserAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role
  // Handles both single role string (legacy) and array logic if you update context
  const userRoles = Array.isArray(user?.roles) ? user.roles : [user?.role];
  
  // Check if any of the user's roles match the allowed roles
  const hasPermission = userRoles.some(r => allowedRoles.includes(r));

  if (!hasPermission) {
    // Redirect to unauthorized or home
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleRoute;
