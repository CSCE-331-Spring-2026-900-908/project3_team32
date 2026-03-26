import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Login.css';

function Login() {
  const { role } = useParams();
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate(`/${role}`);
  };

  return (
    <div className="login">
      <h1>{role.charAt(0).toUpperCase() + role.slice(1)} Login</h1>
      <button onClick={handleLogin}>Continue to Dashboard</button>
    </div>
  );
}

export default Login;
