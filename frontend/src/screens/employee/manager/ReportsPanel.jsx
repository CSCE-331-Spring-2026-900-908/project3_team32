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

  async function runReport(showNoOrdersPopup = true) {
    if (!date) {
      alert('Please select a date.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const report = await getDailyReport(date);
      setItems(report.items);
      setEmployees(report.employees);
      setTotalProfit(report.totalProfit);

      if (showNoOrdersPopup && report.items.length === 0 && report.employees.length === 0) {
        alert(`No orders found for ${date}.`);
      }
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
    <div style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0 }}>Manager View - Daily Report</h2>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Date (YYYY-MM-DD):
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginLeft: 6 }} />
        </label>
        <button onClick={() => runReport(true)}>Run Report</button>
        <button onClick={() => runReport(true)}>Refresh</button>
        <button onClick={clearReport}>Clear</button>
        <strong>Total Profit: {money(totalProfit)}</strong>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setTab('items')} style={{ background: tab === 'items' ? '#e6f7ff' : '#fff' }}>
          Items Sold
        </button>
        <button onClick={() => setTab('employees')} style={{ background: tab === 'employees' ? '#e6f7ff' : '#fff' }}>
          Sales per Employee
        </button>
      </div>

      {error ? <div style={{ color: '#b42318' }}>{error}</div> : null}
      {loading ? <div>Loading report...</div> : null}
      {!loading && noOrders ? <div style={{ color: '#666' }}>No orders found for this date.</div> : null}

      {tab === 'items' ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Menu Item ID</th>
              <th style={{ textAlign: 'left' }}>Item Name</th>
              <th style={{ textAlign: 'left' }}>Qty Sold</th>
              <th style={{ textAlign: 'left' }}>Revenue</th>
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
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Employee ID</th>
              <th style={{ textAlign: 'left' }}>Employee Name</th>
              <th style={{ textAlign: 'left' }}># Sales</th>
              <th style={{ textAlign: 'left' }}>Revenue</th>
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
