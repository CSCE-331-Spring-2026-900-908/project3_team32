import React, { useEffect, useMemo, useState } from 'react';
import MenuManagement from './MenuManagement.jsx';
import InventoryManagement from './InventoryManagement.jsx';
import EmployeeManager from './EmployeeManager.jsx';
import ReportsPanel from './ReportsPanel.jsx';
import SalesReport from './SalesReport.jsx';
import ProductUsage from './ProductUsage.jsx';
import XReport from './XReport.jsx';
import ZReport from './ZReport.jsx';
import { checkDatabaseHealth, getApiBase } from './managerApi.js';

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

const sidebarStyle = {
  width: 240,
  background: '#f6f8fa',
  padding: 12,
  boxSizing: 'border-box',
  borderRight: '1px solid #e1e4e8',
};

export default function ManagerScreen() {
  const [active, setActive] = useState('MENU');
  const [dbStatus, setDbStatus] = useState('Checking...');
  const apiBase = useMemo(() => getApiBase(), []);

  useEffect(() => {
    let mounted = true;

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

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <aside style={sidebarStyle}>
        <div style={{ marginBottom: 12 }}>
          <strong style={{ fontSize: 18 }}>Manager Panel</strong>
        </div>

        {Object.keys(PANELS).map((key) => (
          <button
            key={key}
            onClick={() => setActive(key)}
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

        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/';
            }}
            style={{
              padding: '8px 12px',
              width: '100%',
              border: '1px solid #ddd',
              borderRadius: 4,
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: '#666', wordBreak: 'break-word' }}>
          API: {apiBase}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: dbStatus === 'Connected' ? '#0a7a30' : '#666' }}>
          DB: {dbStatus}
        </div>
      </aside>

      <main style={{ flex: 1, padding: 16, overflow: 'auto' }}>{PANELS[active].comp}</main>
    </div>
  );
}
