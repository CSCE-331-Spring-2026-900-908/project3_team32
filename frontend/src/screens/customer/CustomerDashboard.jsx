import React from 'react';
import { useNavigate } from 'react-router-dom';
import './CustomerDashboard.css';

function CustomerDashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <h1>Customer Dashboard</h1>
      <button onClick={() => navigate('/login/customer')}>Exit</button>
    </div>
  );
}

export default CustomerDashboard;
