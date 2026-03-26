import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Portal.css';

function Portal() {
  const navigate = useNavigate();

  return (
    <div className="portal">
      <h1>Sharetea POS</h1>
      <div className="portal-options">
        <button onClick={() => navigate('/login/customer')}>Customer</button>
        <button onClick={() => navigate('/login/employee')}>Employee</button>
      </div>
    </div>
  );
}

export default Portal;
