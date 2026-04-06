import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Portal from './screens/portal/Portal';
import Login from './screens/auth/Login';
import EmployeeDashboard from './screens/employee/EmployeeDashboard';
import CustomerScreen from './screens/customer/CustomerScreen';
import MenuBoard from "./screens/menu/MenuBoard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Portal />} />
        <Route path="/login/:role" element={<Login />} />
        <Route path="/employee" element={<EmployeeDashboard />} />
        <Route path="/customer" element={<CustomerScreen />} />
        <Route path="/menu-board" element={<MenuBoard />} />
      </Routes>
    </Router>
  );
}

export default App;
