import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isTokenExpired(decoded) {
  if (!decoded?.exp) return true;
  return Date.now() / 1000 > decoded.exp;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('auth_token');
    if (!stored) return null;
    const decoded = decodeToken(stored);
    return isTokenExpired(decoded) ? null : decoded;
  });

  useEffect(() => {
    if (token) {
      const decoded = decodeToken(token);
      if (isTokenExpired(decoded)) {
        logout();
      } else {
        setUser(decoded);
      }
    }
  }, [token]);

  const login = useCallback((newToken) => {
    const decoded = decodeToken(newToken);
    if (!decoded || isTokenExpired(decoded)) return false;
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(decoded);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }, []);

  const isEmployee = user?.type === 'employee';
  const isCustomer = user?.type === 'customer';
  const isManager = isEmployee && ['Manager', 'Shift Lead'].includes(user?.position);
  const isCashier = isEmployee && user?.position === 'Cashier';

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isEmployee, isCustomer, isManager, isCashier }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
