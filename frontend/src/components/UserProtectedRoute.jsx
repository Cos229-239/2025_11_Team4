import { Navigate, useLocation } from 'react-router-dom';
import { useUserAuth } from '../hooks/useUserAuth';

const UserProtectedRoute = ({ children }) => {
  const { token } = useUserAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default UserProtectedRoute;

