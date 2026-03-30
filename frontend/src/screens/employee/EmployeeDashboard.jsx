import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiDollarSign, FiLogOut, FiArrowRight } from 'react-icons/fi';
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
    return <CashierScreen />;
  }
  
  return (
    <div className="employee-dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-content">
            <FiUsers className="header-icon" />
            <div>
              <h1>Employee Dashboard</h1>
              <p>Select your role to continue</p>
            </div>
          </div>
          <button className="logout-btn" onClick={() => navigate('/')}>
            <FiLogOut />
            <span>Logout</span>
          </button>
        </header>

        <div className="role-cards">
          <button className="role-card cashier-card" onClick={() => setView('cashier')}>
            <div className="role-card-content">
              <FiDollarSign className="role-icon" />
              <h2>Cashier</h2>
              <p>Point of sale system for taking customer orders</p>
            </div>
            <FiArrowRight className="role-arrow" />
          </button>

          <button className="role-card manager-card" onClick={() => setView('manager')}>
            <div className="role-card-content">
              <FiUsers className="role-icon" />
              <h2>Manager</h2>
              <p>Inventory, reports, and system management</p>
            </div>
            <FiArrowRight className="role-arrow" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmployeeDashboard;