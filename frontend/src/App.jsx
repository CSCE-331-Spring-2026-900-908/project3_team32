import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Portal from './screens/portal/Portal';
import Login from './screens/auth/Login';
import EmployeeDashboard from './screens/employee/EmployeeDashboard';
import CashierScreen from './screens/employee/cashier/CashierScreen';
import ManagerScreen from './screens/employee/manager/ManagerScreen';
import CustomerScreen from './screens/customer/CustomerScreen';
import MenuBoard from "./screens/menu/MenuBoard";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Portal />} />
            <Route path="/login/:role" element={<Login />} />
            <Route path="/menu-board" element={<MenuBoard />} />

            {/* Customer — requires customer JWT */}
            <Route
              path="/customer"
              element={
                <ProtectedRoute requireType="customer">
                  <CustomerScreen />
                </ProtectedRoute>
              }
            />

            {/* Employee dashboard — managers/shift-leads only (cashiers go directly to /employee/cashier) */}
            <Route
              path="/employee"
              element={
                <ProtectedRoute requireType="employee" requireRoles={['Manager', 'Shift Lead']}>
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />

            {/* Cashier screen — any employee */}
            <Route
              path="/employee/cashier"
              element={
                <ProtectedRoute requireType="employee">
                  <CashierScreen />
                </ProtectedRoute>
              }
            />

            {/* Manager screen — managers/shift-leads only */}
            <Route
              path="/employee/manager"
              element={
                <ProtectedRoute requireType="employee" requireRoles={['Manager', 'Shift Lead']}>
                  <ManagerScreen />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
