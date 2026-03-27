import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ManagerScreen from './manager/ManagerScreen';
import './EmployeeDashboard.css';

function EmployeeDashboard() {
  const navigate = useNavigate();
  const [showManagerView, setShowManagerView] = useState(false);

  if (showManagerView) {
    return <ManagerScreen />;
  }

  return (
    <div className="dashboard">
      <h1>Employee Dashboard</h1>
      <button onClick={() => setShowManagerView(true)}>Manager View</button>
      <button onClick={() => navigate('/')}>Logout</button>
    </div>
  );
}

export default EmployeeDashboard;
