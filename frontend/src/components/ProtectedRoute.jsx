import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * ProtectedRoute
 *
 * Props:
 *   requireType  – 'customer' | 'employee'  (required)
 *   requireRoles – array of position strings, e.g. ['Manager', 'Shift Lead']
 *                  omit to allow any employee
 *   children     – the component to render when access is granted
 *
 * Redirects:
 *   - Not logged in → /login/<requireType>
 *   - Wrong type or insufficient role → /login/employee or /
 */
export default function ProtectedRoute({ requireType, requireRoles, children }) {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!token || !user) {
    const loginPath = requireType === 'customer' ? '/login/customer' : '/login/employee';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (user.type !== requireType) {
    return <Navigate to="/" replace />;
  }

  if (requireRoles && requireRoles.length > 0 && !requireRoles.includes(user.position)) {
    return <Navigate to="/employee/cashier" replace />;
  }

  return children;
}
