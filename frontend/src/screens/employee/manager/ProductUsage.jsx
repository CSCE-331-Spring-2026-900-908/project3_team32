import React, { useMemo, useState } from 'react';
import { apiRequest, unwrapList } from './managerApi.js';

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function getUsageReport(startDate, endDate) {
  const payload = await apiRequest(
    `/reports/inventory?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
  );

  const rows = unwrapList(payload?.usage ?? payload?.items ?? payload, 'usage').map((row) => {
    const starting = Number(row.starting_qty ?? row.startingQty ?? row.starting_quantity ?? 0);
    const used = Number(row.qty_used ?? row.used ?? row.quantity_used ?? 0);
    const remaining = Number(row.remaining_qty ?? row.remaining ?? row.quantity_available ?? 0);
    const percent = Number(
      row.usage_percent ?? row.usagePercent ?? (starting > 0 ? (used * 100) / starting : 0),
    );

    return {
      resource_name: row.resource_name ?? row.resourceName ?? row.name,
      starting_qty: starting,
      used,
      remaining,
      usage_percent: percent,
    };
  });

  return rows;
}

export default function ProductUsage() {
  const [startDate, setStartDate] = useState(isoDaysAgo(7));
  const [endDate, setEndDate] = useState(isoDaysAgo(0));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('table');

  const totals = useMemo(() => {
    const totalItems = rows.length;
    const totalUsed = rows.reduce((sum, row) => sum + row.used, 0);
    const avgUsage = totalItems ? rows.reduce((sum, row) => sum + row.usage_percent, 0) / totalItems : 0;
    return { totalItems, totalUsed, avgUsage };
  }, [rows]);

  const maxUsed = useMemo(() => Math.max(1, ...rows.map((row) => row.used)), [rows]);

  async function load() {
    if (!startDate || !endDate) {
      setError('Please select start and end dates.');
      setMessage('');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const reportRows = await getUsageReport(startDate, endDate);
      setRows(reportRows);
      if (reportRows.length === 0) {
        setMessage('No inventory usage found for the selected period.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load product usage.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="manager-panel">
      <h2>Product Usage</h2>

      <div className="manager-actions">
        <label>
          Start Date:
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ marginLeft: 6 }} />
        </label>
        <label>
          End Date:
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ marginLeft: 6 }} />
        </label>
        <button onClick={load} className="manager-btn manager-btn-primary">Generate Report</button>
      </div>

      <div className="manager-tabs">
        <button 
          onClick={() => setTab('table')} 
          className={`manager-tab-btn ${tab === 'table' ? 'active' : ''}`}
        >
          Table View
        </button>
        <button 
          onClick={() => setTab('chart')} 
          className={`manager-tab-btn ${tab === 'chart' ? 'active' : ''}`}
        >
          Bar Chart
        </button>
      </div>

      {error ? <div style={{ color: '#b42318' }}>{error}</div> : null}
      {message ? <div style={{ color: '#666' }}>{message}</div> : null}
      {loading ? <div>Loading product usage...</div> : null}

      {tab === 'table' ? (
        <table className="manager-table">
          <thead>
            <tr>
              <th>Inventory Item</th>
              <th>Starting Quantity</th>
              <th>Used</th>
              <th>Remaining</th>
              <th>Usage %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.resource_name}>
                <td>{row.resource_name}</td>
                <td>{row.starting_qty.toFixed(1)}</td>
                <td>{row.used.toFixed(1)}</td>
                <td>{row.remaining.toFixed(1)}</td>
                <td>{row.usage_percent.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 10, background: '#fff' }}>
          {rows.length === 0 ? <div>No data to display</div> : null}
          <div style={{ display: 'grid', gap: 8 }}>
            {rows.map((row) => (
              <div key={`${row.resource_name}-bar`}>
                <div style={{ fontSize: 12, marginBottom: 3 }}>{row.resource_name}</div>
                <div style={{ height: 20, background: '#eef2f7', borderRadius: 5, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max(3, (row.used / maxUsed) * 100)}%`,
                      height: '100%',
                      background: '#2f9e44',
                    }}
                    title={`${row.used.toFixed(1)} units`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, fontWeight: 600 }}>
        <span>Total Items: {totals.totalItems}</span>
        <span>Total Used: {totals.totalUsed.toFixed(1)} units</span>
        <span>Avg Usage: {totals.avgUsage.toFixed(1)}%</span>
      </div>
    </div>
  );
}
