import React, { useMemo, useState } from 'react';
import { apiRequest, unwrapList } from './managerApi.js';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function money(value) {
  const n = Number(value || 0);
  return `$${n.toFixed(2)}`;
}

async function getDailyReport(date) {
  const tries = [
    async () => apiRequest(`/reports/daily?date=${encodeURIComponent(date)}`),
    async () => {
      const [items, employees, totals] = await Promise.all([
        apiRequest(`/reports/items-sold?date=${encodeURIComponent(date)}`),
        apiRequest(`/reports/employees?date=${encodeURIComponent(date)}`),
        apiRequest(`/reports/total-profit?date=${encodeURIComponent(date)}`),
      ]);
      return { items, employees, totals };
    },
  ];

  let lastError = null;
  for (const runner of tries) {
    try {
      const data = await runner();
      const items = unwrapList(data?.items ?? data?.itemsSold ?? data?.salesByItem ?? data, 'items').map((row) => ({
        menu_item_id: row.menu_item_id ?? row.menuItemId ?? row.id,
        item_name: row.item_name ?? row.itemName ?? row.name,
        qty_sold: Number(row.qty_sold ?? row.qtySold ?? row.quantity ?? 0),
        revenue: Number(row.revenue ?? row.total ?? 0),
      }));

      const employees = unwrapList(
        data?.employees ?? data?.salesPerEmployee ?? data?.employeeSales ?? data,
        'employees',
      ).map((row) => ({
        employee_id: row.employee_id ?? row.employeeId ?? row.id,
        employee_name: row.employee_name ?? row.employeeName ?? row.name,
        sales_count: Number(row.sales_count ?? row.salesCount ?? row.orders ?? 0),
        revenue: Number(row.revenue ?? row.total ?? 0),
      }));

      const totalProfit = Number(
        data?.totalProfit ?? data?.totals?.total_profit ?? data?.totals?.totalRevenue ?? data?.total_revenue ?? 0,
      );

      return { items, employees, totalProfit };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to load daily report');
}

export default function ReportsPanel() {
  const [date, setDate] = useState(todayIso());
  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('items');

  const noOrders = useMemo(() => items.length === 0 && employees.length === 0, [items, employees]);

  async function runReport() {
    if (!date) {
      setError('Please select a date.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const report = await getDailyReport(date);
      setItems(report.items);
      setEmployees(report.employees);
      setTotalProfit(report.totalProfit);
    } catch (err) {
      setError(err.message || 'Failed to load daily report.');
    } finally {
      setLoading(false);
    }
  }

  function clearReport() {
    setItems([]);
    setEmployees([]);
    setTotalProfit(0);
    setError('');
  }

  return (
    <div className="manager-panel">
      <h2>Daily Report</h2>

      <div className="manager-actions">
        <label>
          Date (YYYY-MM-DD):
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginLeft: 6 }} />
        </label>
        <button onClick={runReport} className="manager-btn manager-btn-primary">Run Report</button>
        <button onClick={runReport} className="manager-btn manager-btn-secondary">Refresh</button>
        <button onClick={clearReport} className="manager-btn manager-btn-secondary">Clear</button>
        <strong>Total Profit: {money(totalProfit)}</strong>
      </div>

      <div className="manager-tabs">
        <button 
          onClick={() => setTab('items')} 
          className={`manager-tab-btn ${tab === 'items' ? 'active' : ''}`}
        >
          Items Sold
        </button>
        <button 
          onClick={() => setTab('employees')} 
          className={`manager-tab-btn ${tab === 'employees' ? 'active' : ''}`}
        >
          Sales per Employee
        </button>
      </div>

      {error ? <div style={{ color: '#b42318' }}>{error}</div> : null}
      {loading ? <div>Loading report...</div> : null}
      {!loading && noOrders ? <div style={{ color: '#666' }}>No orders found for this date.</div> : null}

      {tab === 'items' ? (
        <table className="manager-table">
          <thead>
            <tr>
              <th>Menu Item ID</th>
              <th>Item Name</th>
              <th>Qty Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={`${row.menu_item_id}-${row.item_name}`}>
                <td>{row.menu_item_id}</td>
                <td>{row.item_name}</td>
                <td>{row.qty_sold}</td>
                <td>{money(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="manager-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Employee Name</th>
              <th># Sales</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((row) => (
              <tr key={`${row.employee_id}-${row.employee_name}`}>
                <td>{row.employee_id}</td>
                <td>{row.employee_name}</td>
                <td>{row.sales_count}</td>
                <td>{money(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
