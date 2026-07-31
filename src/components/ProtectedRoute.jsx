import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles, redirectTo = '/login' }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    const home = role === 'SUPER_ADMIN' ? '/admin'
               : role === 'SUB_CUSTOMER' ? '/sub-customer'
               : '/dashboard';
    return <Navigate to={home} replace />;
  }

  return children;
}
