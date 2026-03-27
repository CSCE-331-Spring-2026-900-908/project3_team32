import React, { useState } from 'react';
import { apiRequest, unwrapList } from './managerApi.js';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

async function runZReport(date) {
  const attempts = [
    () => apiRequest('/reports/z-report', { method: 'POST', body: JSON.stringify({ date }) }),
    () => apiRequest('/reports/z', { method: 'POST', body: JSON.stringify({ date }) }),
    () => apiRequest(`/reports/z-report?date=${encodeURIComponent(date)}`, { method: 'POST' }),
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
  const [summary, setSummary] = useState('');
  const [payments, setPayments] = useState([]);

  async function run() {
    if (!date) {
      alert('Please select a date.');
      return;
    }

    if (!window.confirm('Close day and generate Z-Report?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = await runZReport(date);

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
        '',
        'Manager Signature: ____________________________',
        'Date: ____________________________',
      ].join('\n');

      setSummary(reportText);
      setPayments(breakdown);
      alert('Z-Report successfully generated.');
    } catch (err) {
      const msg = err.message || 'Failed to generate Z-Report.';
      setError(msg);
      if (msg.toLowerCase().includes('already')) {
        alert('Z-Report already generated for this date.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0 }}>Z-Report</h2>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Date (YYYY-MM-DD):
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginLeft: 6 }} />
        </label>
        <button onClick={run}>Run Z-Report</button>
      </div>

      {error ? <div style={{ color: '#b42318' }}>{error}</div> : null}
      {loading ? <div>Generating Z-Report...</div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <textarea
          value={summary}
          readOnly
          rows={18}
          style={{ width: '100%', fontFamily: 'Consolas, monospace', padding: 10 }}
        />

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Payment Method</th>
              <th style={{ textAlign: 'left' }}>Count</th>
              <th style={{ textAlign: 'left' }}>Total</th>
              <th style={{ textAlign: 'left' }}>Pct</th>
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
