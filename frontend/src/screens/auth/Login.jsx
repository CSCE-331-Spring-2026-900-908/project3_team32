import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiShoppingBag, FiUsers, FiCheck, FiLock } from 'react-icons/fi';
import './Login.css';

function Login() {
  const { role } = useParams();
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate(`/${role}`);
  };

  const isCustomer = role === 'customer';
  const Icon = isCustomer ? FiShoppingBag : FiUsers;
  const title = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <div className={`login ${role}-login`}>
      <div className="login-card">
        <Icon className="login-icon" />
        
        <h1>{title} Access</h1>
        <p className="login-subtitle">
          {isCustomer 
            ? 'Welcome! Tap below to start your order' 
            : 'Staff authentication required'}
        </p>

        <div className="login-content">
          {isCustomer ? (
            <div className="customer-login-info">
              <div className="info-card">
                <FiCheck className="info-icon" />
                <p>Quick & Easy Ordering</p>
              </div>
              <div className="info-card">
                <FiCheck className="info-icon" />
                <p>Customize Your Drink</p>
              </div>
              <div className="info-card">
                <FiCheck className="info-icon" />
                <p>Multiple Payment Options</p>
              </div>
            </div>
          ) : (
            <div className="employee-login-info">
              <div className="auth-placeholder">
                <FiLock className="auth-icon" />
                <p>OAuth authentication will be implemented here</p>
                <p className="auth-note">Google & GitHub sign-in</p>
              </div>
            </div>
          )}

          <button className="login-button" onClick={handleLogin}>
            {isCustomer ? 'Start Ordering' : 'Continue to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
