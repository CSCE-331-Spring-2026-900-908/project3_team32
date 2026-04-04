import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShoppingBag, FiUsers, FiCoffee } from 'react-icons/fi';
import { HiArrowRight } from 'react-icons/hi';
import './Portal.css';

function Portal() {
  const navigate = useNavigate();

  return (
    <div className="portal">
      <div className="portal-content">
        <div className="portal-header">
          <div className="logo">
            <FiCoffee className="logo-icon" />
            <h1>Team 32's Boba Bar</h1>
          </div>
        </div>

        <div className="portal-cards">
          <button 
            className="portal-card customer-card"
            onClick={() => navigate('/login/customer')}
          >
            <FiShoppingBag className="card-icon" />
            <h2>Customer</h2>
            <p>Self-service kiosk ordering</p>
            <HiArrowRight className="card-arrow" />
          </button>

          <button 
            className="portal-card employee-card"
            onClick={() => navigate('/login/employee')}
          >
            <FiUsers className="card-icon" />
            <h2>Employee</h2>
            <p>Staff access & management</p>
            <HiArrowRight className="card-arrow" />
          </button>
        </div>

        <footer className="portal-footer">
          <p>CSCE 331 • Team 32 • Project 3</p>
        </footer>
      </div>
    </div>
  );
}

export default Portal;
