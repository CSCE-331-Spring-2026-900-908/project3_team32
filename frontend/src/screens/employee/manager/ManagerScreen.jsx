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

export default function ManagerScreen() {
  const navigate = useNavigate();
  const [active, setActive] = useState('MENU');

  return (
    <div className="manager-screen">
      <aside className="manager-sidebar">
        <div className="sidebar-header">
          <h2>Manager Panel</h2>
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
          <button
            onClick={() => {
              localStorage.removeItem('role');
              localStorage.removeItem('employee');
              localStorage.removeItem('user');
              sessionStorage.clear();
              navigate('/');
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