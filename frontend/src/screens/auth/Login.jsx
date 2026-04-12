import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { FiShoppingBag, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext.jsx';
import './Login.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const DEV_MODE = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS === 'true';
const PIN_LENGTH = 4;
const PIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

function Login() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [employeePin, setEmployeePin] = useState('');

  const isCustomer = role === 'customer';
  const Icon = isCustomer ? FiShoppingBag : FiUsers;
  const title = role.charAt(0).toUpperCase() + role.slice(1);

  // Dev-only: bypass Google OAuth with a fake token for local testing
  async function handleDevBypass() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/dev/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Dev login failed');
        return;
      }
      login(data.token);
      if (role === 'customer') {
        navigate('/customer', { replace: true });
      } else {
        navigate(data.user?.position === 'Cashier' ? '/employee/cashier' : '/employee', { replace: true });
      }
    } catch {
      setError('Dev bypass failed - is the backend running?');
    } finally {
      setLoading(false);
    }
  }

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
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError() {
    setError('Google sign-in was cancelled or failed. Please try again.');
  }

  async function handleEmployeePinLogin(event) {
    event.preventDefault();
    if (isCustomer) return;

    const normalizedPin = String(employeePin || '').trim();

    if (!/^\d{4}$/.test(normalizedPin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/pin/employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: normalizedPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'PIN sign-in failed.');
        return;
      }

      login(data.token);
      const position = data.user?.position;
      if (position === 'Cashier') {
        navigate('/employee/cashier', { replace: true });
      } else {
        navigate('/employee', { replace: true });
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isCustomer || loading) return;
    const normalizedPin = String(employeePin || '').trim();
    if (!/^\d{4}$/.test(normalizedPin)) return;

    async function autoSubmitPin() {
      setError('');
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/auth/pin/employee`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: normalizedPin }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'PIN sign-in failed.');
          return;
        }

        login(data.token);
        const position = data.user?.position;
        if (position === 'Cashier') {
          navigate('/employee/cashier', { replace: true });
        } else {
          navigate('/employee', { replace: true });
        }
      } catch {
        setError('Network error. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }

    autoSubmitPin();
  }, [employeePin, isCustomer]);

  function handlePinPress(value) {
    if (loading) return;
    setError('');
    if (value === 'clear') {
      setEmployeePin('');
      return;
    }
    if (value === 'back') {
      setEmployeePin((prev) => prev.slice(0, -1));
      return;
    }
    setEmployeePin((prev) => (prev.length < PIN_LENGTH ? `${prev}${value}` : prev));
  }

  return (
    <div className={`login ${role}-login`}>
      <div className="login-card">
        <Icon className="login-icon" />
        <h1>{title} Access</h1>
        <p className="login-subtitle">
          {isCustomer
            ? 'Sign in with Google to start your order and track order history'
            : 'Staff authentication - use your registered Google account or employee PIN'}
        </p>

        <div className="login-content">
          {isCustomer ? (
            error ? (
              <div className="login-error">
                {error}
              </div>
            ) : null
          ) : (
            <div className="login-error-slot" aria-live="polite">
              {loading ? (
                <div className="login-loading-inline">Signing you in...</div>
              ) : error ? (
                <div className="login-error">
                  {error}
                </div>
              ) : (
                <div className="login-error login-error-hidden" aria-hidden="true">
                  Placeholder
                </div>
              )}
            </div>
          )}

          {isCustomer ? (
            loading ? (
              <div className="login-loading">Signing you in...</div>
            ) : (
              DEV_MODE ? (
                <div className="google-login-wrapper">
                  <button className="login-button" onClick={handleDevBypass}>
                    Dev Bypass - Skip Google Login
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
                    text="signin_with"
                    shape="rectangular"
                  />
                </div>
              )
            )
          ) : (
            <>
              <div className="employee-login-layout">
                <div className="employee-pin-section">
                  <form className="pin-login-form" onSubmit={handleEmployeePinLogin}>
                    <label>
                      4-Digit PIN
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={PIN_LENGTH}
                        value={employeePin}
                        onChange={(e) => setEmployeePin(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
                        required
                        disabled={loading}
                      />
                    </label>

                    <div className="pin-pad" role="group" aria-label="PIN keypad">
                      {PIN_KEYS.map((digit) => (
                        <button
                          key={digit}
                          type="button"
                          className="pin-pad-btn"
                          onClick={() => handlePinPress(digit)}
                          disabled={loading}
                        >
                          {digit}
                        </button>
                      ))}
                      <button type="button" className="pin-pad-btn pin-pad-btn-alt" onClick={() => handlePinPress('clear')} disabled={loading}>
                        Clear
                      </button>
                      <button type="button" className="pin-pad-btn" onClick={() => handlePinPress('0')} disabled={loading}>
                        0
                      </button>
                      <button type="button" className="pin-pad-btn pin-pad-btn-alt" onClick={() => handlePinPress('back')} disabled={loading}>
                        Back
                      </button>
                    </div>

                    <button type="submit" className="login-button pin-login-btn" disabled={loading || employeePin.length !== PIN_LENGTH}>
                      Sign In with PIN
                    </button>
                  </form>
                </div>

                <div className="employee-google-section">
                  <div className="login-divider"><span>Google Sign-In</span></div>
                  {DEV_MODE ? (
                    <div className="google-login-wrapper">
                      <button className="login-button" onClick={handleDevBypass}>
                        Dev Bypass - Skip Google Login
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
                        text="signin_with"
                        shape="rectangular"
                        width="100%"
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
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
