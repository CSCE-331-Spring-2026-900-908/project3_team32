import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuManagement from './MenuManagement.jsx';
import InventoryManagement from './InventoryManagement.jsx';
import EmployeeManager from './EmployeeManager.jsx';
import ReportsPanel from './ReportsPanel.jsx';
import SalesReport from './SalesReport.jsx';
import ProductUsage from './ProductUsage.jsx';
import XReport from './XReport.jsx';
import ZReport from './ZReport.jsx';
import './ManagerScreen.css';

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

<<<<<<< HEAD
// Styling for the left sidebar navigation
const sidebarStyle = {
  width: 240,
  background: '#f6f8fa',
  padding: 12,
  boxSizing: 'border-box',
  borderRight: '1px solid #e1e4e8',
};

export default function ManagerScreen() {
  const [active, setActive] = useState('MENU'); // Tracks currently selected panel
  const [dbStatus, setDbStatus] = useState('Checking...'); // Displays DB connection state
  const apiBase = useMemo(() => getApiBase(), []); // Memoize API base URL so it doesn't recompute

  useEffect(() => {
    let mounted = true; // Prevents state updates if component unmounts

    checkDatabaseHealth()
      .then((health) => {
        if (!mounted) return;
        const db = health?.database === 'connected' ? 'Connected' : 'Disconnected';
        setDbStatus(db);
      })
      .catch(() => {
        if (!mounted) return;
        setDbStatus('Unavailable');
      });

    return () => {
      mounted = false;
    };
  }, []);
=======
export default function ManagerScreen() {
  const navigate = useNavigate();
  const [active, setActive] = useState('MENU');
>>>>>>> a2cc746ee7a661c84072a56d15c25e5b242f6d9c

  return (
    <div className="manager-screen">
      <aside className="manager-sidebar">
        <div className="sidebar-header">
          <h2>Manager Panel</h2>
        </div>

<<<<<<< HEAD
        {/* Dynamically render sidebar buttons for each panel */}
        {Object.keys(PANELS).map((key) => (
          <button
            key={key}
            onClick={() => setActive(key)} // Switch active panel
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 12px',
              marginBottom: 8,
              textAlign: 'left',
              background: active === key ? '#e6f7ff' : 'transparent',
              border: '1px solid #ddd',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {PANELS[key].title}
          </button>
        ))}
=======
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
>>>>>>> a2cc746ee7a661c84072a56d15c25e5b242f6d9c

        <div className="sidebar-footer">
          <button
            onClick={() => {
<<<<<<< HEAD
              localStorage.removeItem('token'); // Clear auth token
              window.location.href = '/'; // Redirect to login/home
            }}
            style={{
              padding: '8px 12px',
              width: '100%',
              border: '1px solid #ddd',
              borderRadius: 4,
              background: '#fff',
              cursor: 'pointer',
=======
              localStorage.removeItem('role');
              localStorage.removeItem('employee');
              localStorage.removeItem('user');
              sessionStorage.clear();
              navigate('/');
>>>>>>> a2cc746ee7a661c84072a56d15c25e5b242f6d9c
            }}
            className="logout-button"
          >
            Logout
          </button>
        </div>
<<<<<<< HEAD

        {/* Debug / status info */}
        <div style={{ marginTop: 12, fontSize: 12, color: '#666', wordBreak: 'break-word' }}>
          API: {apiBase}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: dbStatus === 'Connected' ? '#0a7a30' : '#666' }}>
          DB: {dbStatus}
        </div>
      </aside>

      {/* Main content renders the selected panel */}
      <main style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {PANELS[active].comp}
      </main>
=======
      </aside>

      <main className="manager-content">{PANELS[active].comp}</main>
>>>>>>> a2cc746ee7a661c84072a56d15c25e5b242f6d9c
    </div>
  );
}