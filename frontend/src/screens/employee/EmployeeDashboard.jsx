import React from 'react';
import { useNavigate } from 'react-router-dom';
import './EmployeeDashboard.css';

function EmployeeDashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <h1>Employee Dashboard</h1>
      <button onClick={() => navigate('/')}>Logout</button>
    </div>
  );
}

export default EmployeeDashboard;
