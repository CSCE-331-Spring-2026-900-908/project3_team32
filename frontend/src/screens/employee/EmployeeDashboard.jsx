import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ManagerScreen from './manager/ManagerScreen';
import CashierScreen from './cashier/CashierScreen';
import './EmployeeDashboard.css';

function EmployeeDashboard() {
  const navigate = useNavigate();
  const [view, setView] = useState('dashboard');

  if (view === 'manager') {
    return <ManagerScreen />;
  }

  if (view === 'cashier') {
    return <CashierScreen onExit={() => setView('dashboard')} />;
  }

  return (
    <div className="dashboard">
      <h1>Employee Dashboard</h1>
      <div className="dashboard-actions">
        <button onClick={() => setView('cashier')}>Cashier View</button>
        <button onClick={() => setView('manager')}>Manager View</button>
        <button onClick={() => navigate('/')}>Logout</button>
      </div>
    </div>
  );
}

export default EmployeeDashboard;