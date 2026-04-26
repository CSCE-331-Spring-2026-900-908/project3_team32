import React, { useState } from 'react';
import { apiRequest, unwrapList } from './managerApi.js';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

async function loadZReport(date) {
  const attempts = [
    () => apiRequest(`/reports/z-report?date=${encodeURIComponent(date)}`, { method: 'GET' }),
    () => apiRequest(`/reports/z?date=${encodeURIComponent(date)}`, { method: 'GET' }),
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Unable to load Z-Report');
}

async function generateZReport(date) {
  const attempts = [
    () => apiRequest('/reports/z-report', { method: 'POST', body: JSON.stringify({ date }) }),
    () => apiRequest('/reports/z', { method: 'POST', body: JSON.stringify({ date }) }),
    () => apiRequest(`/reports/z-report?date=${encodeURIComponent(date)}`, { method: 'POST', body: JSON.stringify({}) }),
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Unable to generate Z-Report');
}

export default function ZReport() {
  const [date, setDate] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState('');
  const [payments, setPayments] = useState([]);

  function displayReport(payload) {
    const breakdown = unwrapList(payload?.payments ?? payload?.paymentBreakdown ?? payload, 'payments').map((row) => ({
      method: row.method ?? row.payment_method ?? row.paymentType ?? 'Not Specified',
      count: Number(row.count ?? row.cnt ?? 0),
      total: Number(row.total ?? 0),
      pct: Number(row.pct ?? row.percent ?? 0),
    }));

    const totalOrders = Number(payload?.totalOrders ?? payload?.summary?.total_orders ?? 0);
    const totalSales = Number(payload?.totalSales ?? payload?.summary?.total_sales ?? 0);
    const totalCash = Number(payload?.totalCash ?? payload?.summary?.total_cash ?? 0);

    const employeeLines = unwrapList(payload?.employees ?? payload?.employeeSummary ?? [], 'employees').map(
      (row) => ` - ${(row.name ?? row.employee_name ?? 'Unknown')} : ${Number(row.orders ?? row.count ?? 0)} orders`,
    );

    const reportText = [
      `Z-Report for ${date}`,
      '',
      `Total Orders: ${totalOrders}`,
      `Total Sales: ${money(totalSales)}`,
      `Total Cash: ${money(totalCash)}`,
      '',
      'Employee Summary:',
      ...(employeeLines.length ? employeeLines : [' - No employee data']),
    ].join('\n');

    setSummary(reportText);
    setPayments(breakdown);
  }

  async function loadExistingReport() {
    if (!date) {
      setError('Please select a date.');
      setMessage('');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const payload = await loadZReport(date);
      displayReport(payload);
      setMessage(`Loaded Z-Report for ${date}.`);
    } catch (err) {
      const msg = err.message || 'Failed to load Z-Report.';
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        setError(`No Z-Report found for ${date}.`);
      } else {
        setError(`Error loading Z-Report: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function generateNewReport() {
    if (!date) {
      setError('Please select a date.');
      setMessage('');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const payload = await generateZReport(date);
      displayReport(payload);
      setMessage(`Z-Report generated for ${date}.`);
    } catch (err) {
      const msg = err.message || 'Failed to generate Z-Report.';
      if (msg.includes('409') || msg.toLowerCase().includes('already exists')) {
        setError(`Z-Report already exists for ${date}.`);
      } else {
        setError(`Error generating Z-Report: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="manager-panel">
      <h2>Z-Report</h2>

      <div className="manager-actions">
        <label>
          Date (YYYY-MM-DD):
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginLeft: 6 }} />
        </label>
        <button onClick={loadExistingReport} className="manager-btn" disabled={loading}>
          Load Z-Report
        </button>
        <button onClick={generateNewReport} className="manager-btn manager-btn-primary" disabled={loading}>
          Generate Z-Report
        </button>
      </div>

      {error ? <div className="manager-error">{error}</div> : null}
      {message ? <div style={{ color: '#0f5132' }}>{message}</div> : null}
      {loading ? <div>Processing...</div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <textarea
          value={summary}
          readOnly
          rows={18}
          style={{ width: '100%', fontFamily: 'Consolas, monospace', padding: 10 }}
        />

        <table className="manager-table">
          <thead>
            <tr>
              <th>Payment Method</th>
              <th>Count</th>
              <th>Total</th>
              <th>Pct</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((row) => (
              <tr key={row.method}>
                <td>{row.method}</td>
                <td>{row.count}</td>
                <td>{money(row.total)}</td>
                <td>{row.pct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
