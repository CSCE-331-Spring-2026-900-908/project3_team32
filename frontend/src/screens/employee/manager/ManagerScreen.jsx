import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import MenuManagement from './MenuManagement.jsx';
import InventoryManagement from './InventoryManagement.jsx';
import EmployeeManager from './EmployeeManager.jsx';
import ReportsPanel from './ReportsPanel.jsx';
import SalesReport from './SalesReport.jsx';
import ProductUsage from './ProductUsage.jsx';
import XReport from './XReport.jsx';
import ZReport from './ZReport.jsx';
import './ManagerScreen.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Defines all available panels and their corresponding components
const PANELS = {
  MENU: { title: 'Menu', comp: <MenuManagement /> },
  INVENTORY: { title: 'Inventory', comp: <InventoryManagement /> },
  EMPLOYEE: { title: 'Employees', comp: <EmployeeManager /> },
  REPORTS: { title: 'Daily Reports', comp: <ReportsPanel /> },
  SALES: { title: 'Sales Report', comp: <SalesReport /> },
  USAGE: { title: 'Product Usage', comp: <ProductUsage /> },
  XREPORT: { title: 'X-Report', comp: <XReport /> },
  ZREPORT: { title: 'Z-Report', comp: <ZReport /> },
};

export default function ManagerScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [active, setActive] = useState('MENU');
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');

  useEffect(() => {
    let timerId = null;

    async function loadWeather() {
      try {
        setWeatherLoading(true);
        const response = await fetch(`${API_BASE}/external/weather?city=College%20Station,US`);
        if (!response.ok) throw new Error('Unable to load weather');
        const data = await response.json();
        setWeather(data);
        setWeatherError('');
      } catch (error) {
        console.error('Weather fetch failed:', error);
        setWeather(null);
        setWeatherError('Weather unavailable');
      } finally {
        setWeatherLoading(false);
      }
    }

    loadWeather();
    timerId = window.setInterval(loadWeather, 10 * 60 * 1000);
    return () => {
      if (timerId) window.clearInterval(timerId);
    };
  }, []);

  return (
    <div className="manager-screen">
      <aside className="manager-sidebar">
        <div className="sidebar-header">
          <h2>Manager Panel</h2>
          <div className="manager-weather" title={weather?.description || weatherError || 'Current weather'}>
            <span className="manager-weather-label">Weather</span>
            <span className="manager-weather-value">
              {weatherLoading ? 'Loading...' : weather ? `${Math.round(weather.temperature)}°F` : 'N/A'}
            </span>
            {weather?.isSevere && <span className="manager-weather-warning" aria-label="Bad weather warning">⚠</span>}
          </div>
        </div>

        <nav className="sidebar-nav">
          {Object.keys(PANELS).map((key) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`nav-button ${active === key ? 'active' : ''}`}
            >
              {PANELS[key].title}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-role">{user.position}</span>
            </div>
          )}
          <button
            onClick={() => {
              logout();
              navigate('/login/employee', { replace: true });
            }}
            className="logout-button"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="manager-content">{PANELS[active].comp}</main>
    </div>
  );
}
