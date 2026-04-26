import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { FiShoppingBag, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext.jsx';
import './Login.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const DEV_MODE = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS === 'true';

function formatPhone(digits) {
  if (!digits) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function Login() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Customer phone-only state
  const [phoneDigits, setPhoneDigits] = useState('');

  // Employee state
  const [employeePin, setEmployeePin] = useState('');

  const isCustomer = role === 'customer';
  const Icon = isCustomer ? FiShoppingBag : FiUsers;
  const title = role.charAt(0).toUpperCase() + role.slice(1);

  // ====================== CUSTOMER PHONE LOGIN ======================
  async function handleCustomerLogin() {
    if (phoneDigits.length !== 10) {
      setError('Please enter a complete 10-digit phone number');
      return;
    }

    setError('');
    setLoading(true);
    try {
      // Correct URL - no double /api
      const res = await fetch(`${API_BASE}/auth/phone/customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneDigits }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed. Please try again.');
        return;
      }

      login(data.token);
      navigate('/customer', { replace: true });
    } catch (err) {
      console.error(err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleDigitPress(digit) {
    if (loading) return;
    setError('');
    if (phoneDigits.length < 10) {
      setPhoneDigits(prev => prev + digit);
    }
  }

  function handleClear() {
    setPhoneDigits('');
    setError('');
  }

  function handleBackspace() {
    setPhoneDigits(prev => prev.slice(0, -1));
    setError('');
  }

  // ====================== GUEST ======================
  async function handleGuestSignIn() {
    if (!isCustomer) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/guest/customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      login(data.token);
      navigate('/customer', { replace: true });
    } catch {
      setError('Guest sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ====================== EMPLOYEE PIN ======================
  async function handleEmployeePinLogin(e) {
    e.preventDefault();
    if (isCustomer) return;

    const pin = employeePin.trim();
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/pin/employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid PIN');
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
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handlePinPress(value) {
    if (loading) return;
    setError('');
    if (value === 'clear') {
      setEmployeePin('');
      return;
    }
    if (value === 'back') {
      setEmployeePin(prev => prev.slice(0, -1));
      return;
    }
    setEmployeePin(prev => (prev.length < 4 ? prev + value : prev));
  }

  useEffect(() => {
    if (isCustomer || loading) return;
    if (employeePin.length === 4) {
      handleEmployeePinLogin({ preventDefault: () => {} });
    }
  }, [employeePin, isCustomer, loading]);

  // ====================== GOOGLE LOGIN ======================
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
        setError(data.error || 'Authentication failed.');
        return;
      }

      login(data.token);
      if (isCustomer) {
        navigate('/customer', { replace: true });
      } else {
        const position = data.user?.position;
        navigate(position === 'Cashier' ? '/employee/cashier' : '/employee', { replace: true });
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError() {
    setError('Google sign-in was cancelled or failed.');
  }

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
      setError('Dev bypass failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`login ${role}-login`}>
      <div className="login-card">
        <Icon className="login-icon" />
        <h1>{title} Access</h1>
        <p className="login-subtitle">
          {isCustomer
            ? 'Enter your phone number to sign in or create an account'
            : 'Staff authentication - use Google or employee PIN'}
        </p>

        <div className="login-content">
          {error && <div className="login-error">{error}</div>}

          {isCustomer ? (
            loading ? (
              <div className="login-loading">Signing you in...</div>
            ) : (
              <>
                {/* PHONE NUMBER IN WHITE BOX */}
                <div className="phone-input-box">
                  <label className="phone-label">Phone Number</label>
                  <div className="phone-display">
                    {formatPhone(phoneDigits) || '(   )    -    '}
                  </div>
                </div>

                {/* PHONE PINPAD */}
                <div className="pin-pad phone-pinpad" style={{ marginBottom: '2.5rem' }}>
                  {['1','2','3','4','5','6','7','8','9'].map(digit => (
                    <button
                      key={digit}
                      type="button"
                      className="pin-pad-btn"
                      onClick={() => handleDigitPress(digit)}
                    >
                      {digit}
                    </button>
                  ))}
                  <button type="button" className="pin-pad-btn pin-pad-btn-alt" onClick={handleClear}>
                    Clear
                  </button>
                  <button type="button" className="pin-pad-btn" onClick={() => handleDigitPress('0')}>
                    0
                  </button>
                  <button type="button" className="pin-pad-btn pin-pad-btn-alt" onClick={handleBackspace}>
                    ←
                  </button>
                </div>

                <div className="customer-login-actions">
                  <button
                    className="login-button"
                    onClick={handleCustomerLogin}
                    disabled={phoneDigits.length !== 10}
                  >
                    Sign In
                  </button>

                  <button className="login-button guest-login-btn" onClick={handleGuestSignIn}>
                    Continue as Guest
                  </button>
                </div>
              </>
            )
          ) : (
            /* ==================== EMPLOYEE SECTION (unchanged) ==================== */
            <div className="employee-login-layout">
              <div className="employee-pin-section">
                <form className="pin-login-form" onSubmit={handleEmployeePinLogin}>
                  <label>
                    4-Digit PIN
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={employeePin}
                      onChange={(e) => setEmployeePin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      required
                      disabled={loading}
                    />
                  </label>

                  <div className="pin-pad" role="group" aria-label="PIN keypad">
                    {['1','2','3','4','5','6','7','8','9'].map(digit => (
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

                  <button type="submit" className="login-button pin-login-btn" disabled={loading || employeePin.length !== 4}>
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
