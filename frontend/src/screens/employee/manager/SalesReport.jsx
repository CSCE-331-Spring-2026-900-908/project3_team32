import React, { useMemo, useState } from 'react';
import { apiRequest, unwrapList } from './managerApi.js';

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

async function getSalesReport(startDate, endDate) {
  const payload = await apiRequest(
    `/reports/sales?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
  );

  const rows = unwrapList(payload?.items ?? payload?.sales ?? payload, 'items').map((row) => ({
    item_name: row.item_name ?? row.itemName ?? row.name,
    category: row.category ?? 'Uncategorized',
    qty_sold: Number(row.qty_sold ?? row.qtySold ?? row.quantity ?? 0),
    revenue: Number(row.revenue ?? row.total ?? 0),
    avg_price: Number(row.avg_price ?? row.avgPrice ?? 0),
    percent_of_total: Number(row.percent_of_total ?? row.percentOfTotal ?? 0),
  }));

  const totalItems = rows.length;
  const totalQuantity = rows.reduce((sum, row) => sum + row.qty_sold, 0);
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);

  return { rows, totalItems, totalQuantity, totalRevenue };
}

export default function SalesReport() {
  const [startDate, setStartDate] = useState(isoDaysAgo(30));
  const [endDate, setEndDate] = useState(isoDaysAgo(0));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const topTen = useMemo(() => rows.slice(0, 10), [rows]);
  const maxRevenue = useMemo(() => Math.max(1, ...topTen.map((row) => row.revenue)), [topTen]);

  const totalItems = rows.length;
  const totalQuantity = rows.reduce((sum, row) => sum + row.qty_sold, 0);
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);

  async function load() {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const report = await getSalesReport(startDate, endDate);
      setRows(report.rows);
      if (report.rows.length === 0) {
        alert('No sales found for the selected period.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load sales report.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0 }}>Sales Report by Item</h2>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Start Date:
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ marginLeft: 6 }} />
        </label>
        <label>
          End Date:
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ marginLeft: 6 }} />
        </label>
        <button onClick={load}>Generate Report</button>
      </div>

      {error ? <div style={{ color: '#b42318' }}>{error}</div> : null}
      {loading ? <div>Loading sales report...</div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Menu Item</th>
              <th style={{ textAlign: 'left' }}>Category</th>
              <th style={{ textAlign: 'left' }}>Quantity Sold</th>
              <th style={{ textAlign: 'left' }}>Revenue</th>
              <th style={{ textAlign: 'left' }}>Avg Price</th>
              <th style={{ textAlign: 'left' }}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.item_name}-${row.category}`}>
                <td>{row.item_name}</td>
                <td>{row.category}</td>
                <td>{row.qty_sold}</td>
                <td>{money(row.revenue)}</td>
                <td>{money(row.avg_price)}</td>
                <td>{row.percent_of_total.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 10, background: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>Top 10 Items by Revenue</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {topTen.map((row) => (
              <div key={`${row.item_name}-bar`}>
                <div style={{ fontSize: 12, marginBottom: 3 }}>{row.item_name}</div>
                <div style={{ height: 20, background: '#eef2f7', borderRadius: 5, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max(3, (row.revenue / maxRevenue) * 100)}%`,
                      height: '100%',
                      background: '#4f7cff',
                    }}
                    title={money(row.revenue)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, fontWeight: 600 }}>
        <span>Total Items: {totalItems}</span>
        <span>Total Quantity: {totalQuantity}</span>
        <span>Total Revenue: {money(totalRevenue)}</span>
      </div>
    </div>
  );
}
