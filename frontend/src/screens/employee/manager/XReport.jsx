import React, { useMemo, useState } from 'react';
import { apiRequest, unwrapList } from './managerApi.js';

const OPEN_HOUR = 8;
const CLOSE_HOUR = 21;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function buildDefaultRows() {
  const rows = [];
  for (let hour = OPEN_HOUR; hour <= CLOSE_HOUR; hour += 1) {
    rows.push({
      hour,
      label: `${String(hour).padStart(2, '0')}:00 - ${String(hour).padStart(2, '0')}:59`,
      transactions: 0,
      items_sold: 0,
      avg_order_cost: 0,
      top_employee: 'N/A',
      top_item: 'N/A',
    });
  }
  return rows;
}

async function fetchXReport(date) {
  const endpoints = [
    `/reports/x-report?date=${encodeURIComponent(date)}`,
    `/reports/x?date=${encodeURIComponent(date)}`,
  ];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const payload = await apiRequest(endpoint);
      const rows = unwrapList(payload?.hours ?? payload?.hourly ?? payload, 'hours').map((row) => ({
        hour: Number(row.hour ?? row.hr ?? 0),
        label:
          row.label ||
          `${String(Number(row.hour ?? 0)).padStart(2, '0')}:00 - ${String(Number(row.hour ?? 0)).padStart(2, '0')}:59`,
        transactions: Number(row.transactions ?? row.txns ?? 0),
        items_sold: Number(row.items_sold ?? row.itemsSold ?? 0),
        avg_order_cost: Number(row.avg_order_cost ?? row.avgOrderCost ?? 0),
        top_employee: row.top_employee ?? row.topEmployee ?? 'N/A',
        top_item: row.top_item ?? row.topItem ?? 'N/A',
      }));

      return rows.length ? rows : buildDefaultRows();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to load X-Report');
}

export default function XReport() {
  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState(buildDefaultRows());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('hourly');

  const maxTransactions = useMemo(() => Math.max(1, ...rows.map((row) => row.transactions)), [rows]);
  const maxItems = useMemo(() => Math.max(1, ...rows.map((row) => row.items_sold)), [rows]);

  async function loadReport() {
    if (!date) {
      alert('Please select a date.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const reportRows = await fetchXReport(date);
      const normalized = buildDefaultRows().map((baseRow) => {
        const match = reportRows.find((row) => Number(row.hour) === Number(baseRow.hour));
        return match || baseRow;
      });
      setRows(normalized);

      const anyOrders = normalized.some((row) => row.transactions > 0);
      if (!anyOrders) {
        alert(`No orders found for ${date}.`);
      }
    } catch (err) {
      setError(err.message || 'Failed to load X-Report.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0 }}>X-Report</h2>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Date (YYYY-MM-DD):
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginLeft: 6 }} />
        </label>
        <button onClick={loadReport}>Load X-Report</button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setTab('hourly')} style={{ background: tab === 'hourly' ? '#e6f7ff' : '#fff' }}>
          Hourly Breakdown
        </button>
        <button onClick={() => setTab('graphs')} style={{ background: tab === 'graphs' ? '#e6f7ff' : '#fff' }}>
          Graphs
        </button>
      </div>

      {error ? <div style={{ color: '#b42318' }}>{error}</div> : null}
      {loading ? <div>Loading X-Report...</div> : null}

      {tab === 'hourly' ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Hour</th>
              <th style={{ textAlign: 'left' }}>Transactions</th>
              <th style={{ textAlign: 'left' }}>Items Sold</th>
              <th style={{ textAlign: 'left' }}>Avg Order Cost</th>
              <th style={{ textAlign: 'left' }}>Top Employee (Transactions)</th>
              <th style={{ textAlign: 'left' }}>Top Item (Qty)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.hour}>
                <td>{row.label}</td>
                <td>{row.transactions}</td>
                <td>{row.items_sold}</td>
                <td>{money(row.avg_order_cost)}</td>
                <td>{row.top_employee}</td>
                <td>{row.top_item}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 10, background: '#fff' }}>
            <h3 style={{ marginTop: 0 }}>Transactions per Hour</h3>
            <div style={{ display: 'grid', gap: 6 }}>
              {rows.map((row) => (
                <div key={`${row.hour}-txn`}>
                  <div style={{ fontSize: 12, marginBottom: 2 }}>{String(row.hour).padStart(2, '0')}</div>
                  <div style={{ background: '#eef2f7', height: 18, borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(2, (row.transactions / maxTransactions) * 100)}%`,
                        height: '100%',
                        background: '#4f7cff',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 10, background: '#fff' }}>
            <h3 style={{ marginTop: 0 }}>Items per Hour</h3>
            <div style={{ display: 'grid', gap: 6 }}>
              {rows.map((row) => (
                <div key={`${row.hour}-items`}>
                  <div style={{ fontSize: 12, marginBottom: 2 }}>{String(row.hour).padStart(2, '0')}</div>
                  <div style={{ background: '#eef2f7', height: 18, borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(2, (row.items_sold / maxItems) * 100)}%`,
                        height: '100%',
                        background: '#2f9e44',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
