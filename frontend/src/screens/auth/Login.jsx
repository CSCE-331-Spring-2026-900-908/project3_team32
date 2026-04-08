import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { FiShoppingBag, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext.jsx';
import './Login.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const DEV_MODE = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS === 'true';

function Login() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Dev-only: bypass Google OAuth with a fake token for local testing
  async function handleDevBypass() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/dev/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Dev login failed'); return; }
      login(data.token);
      if (role === 'customer') {
        navigate('/customer', { replace: true });
      } else {
        navigate(data.user?.position === 'Cashier' ? '/employee/cashier' : '/employee', { replace: true });
      }
    } catch {
      setError('Dev bypass failed — is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  const isCustomer = role === 'customer';
  const Icon = isCustomer ? FiShoppingBag : FiUsers;
  const title = role.charAt(0).toUpperCase() + role.slice(1);

  async function handleGoogleSuccess(credentialResponse) {
    setError('');
    setLoading(true);
    try {
      const endpoint = isCustomer
        ? `${API_BASE}/auth/google/customer`
        : `${API_BASE}/auth/google/employee`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please try again.');
        return;
      }

      login(data.token);

      if (isCustomer) {
        navigate('/customer', { replace: true });
      } else {
        const position = data.user?.position;
        if (position === 'Cashier') {
          navigate('/employee/cashier', { replace: true });
        } else {
          navigate('/employee', { replace: true });
        }
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError() {
    setError('Google sign-in was cancelled or failed. Please try again.');
  }

  return (
    <div className={`login ${role}-login`}>
      <div className="login-card">
        <Icon className="login-icon" />
        <h1>{title} Access</h1>
        <p className="login-subtitle">
          {isCustomer
            ? 'Sign in with Google to start your order and track order history'
            : 'Staff authentication — use your registered Google account'}
        </p>

        <div className="login-content">
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {loading ? (
            <div className="login-loading">Signing you in...</div>
          ) : DEV_MODE ? (
            <div className="google-login-wrapper">
              <button className="login-button" onClick={handleDevBypass}>
                Dev Bypass — Skip Google Login
              </button>
            </div>
          ) : (
            <div className="google-login-wrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                theme="outline"
                size="large"
                text={isCustomer ? 'signin_with' : 'signin_with'}
                shape="rectangular"
              />
            </div>
          )}

          {!isCustomer && (
            <p className="auth-note">
              Only pre-registered employee accounts can sign in. Contact your manager if you need access.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
