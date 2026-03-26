import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Portal from './screens/portal/Portal';
import Login from './screens/auth/Login';
import EmployeeDashboard from './screens/employee/EmployeeDashboard';
import CustomerDashboard from './screens/customer/CustomerDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Portal />} />
        <Route path="/login/:role" element={<Login />} />
        <Route path="/employee" element={<EmployeeDashboard />} />
        <Route path="/customer" element={<CustomerDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
