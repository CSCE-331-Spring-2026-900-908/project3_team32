import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest, unwrapList } from './managerApi.js';

export default function InventoryManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('add');
  const [form, setForm] = useState({ inventory_id: '', resource_name: '', quantity_available: '' });

  const selected = useMemo(
    () => items.find((item) => Number(item.inventory_id) === Number(selectedId)) || null,
    [items, selectedId],
  );

  async function loadInventory() {
    setLoading(true);
    setError('');
    try {
      const payload = await apiRequest('/inventory');
      const rows = unwrapList(payload, 'inventory').map((row) => ({
        inventory_id: row.inventory_id ?? row.inventoryId ?? row.id,
        resource_name: row.resource_name ?? row.resourceName,
        quantity_available: Number(row.quantity_available ?? row.quantityAvailable ?? row.quantity ?? 0),
      }));
      setItems(rows);
    } catch (err) {
      setError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  function openAdd() {
    setMode('add');
    setForm({ inventory_id: '', resource_name: '', quantity_available: '' });
    setShowForm(true);
  }

  function openEdit(item = selected) {
    if (!item) {
      alert('Please select an inventory item to edit.');
      return;
    }
    setMode('edit');
    setForm({
      inventory_id: item.inventory_id,
      resource_name: item.resource_name,
      quantity_available: String(item.quantity_available),
    });
    setShowForm(true);
  }

  async function submitForm(e) {
    e.preventDefault();

    const resource_name = form.resource_name.trim();
    const quantity_available = Number(form.quantity_available);

    if (!resource_name || Number.isNaN(quantity_available) || quantity_available < 0) {
      alert('Please enter a valid resource name and non-negative quantity.');
      return;
    }

    const body = { resource_name, quantity_available };

    try {
      if (mode === 'add') {
        await apiRequest('/inventory', { method: 'POST', body: JSON.stringify(body) });
      } else {
        await apiRequest(`/inventory/${form.inventory_id}`, { method: 'PUT', body: JSON.stringify(body) });
      }
      setShowForm(false);
      await loadInventory();
    } catch (err) {
      alert(err.message || 'Failed to save inventory item.');
    }
  }

  async function deleteSelected() {
    if (!selected) {
      alert('Please select an inventory item to delete.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete '${selected.resource_name}'?`)) {
      return;
    }

    try {
      await apiRequest(`/inventory/${selected.inventory_id}`, { method: 'DELETE' });
      setSelectedId(null);
      await loadInventory();
    } catch (err) {
      alert(err.message || 'Failed to delete inventory item.');
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0 }}>Manager View - Inventory Management</h2>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={openAdd}>Add Item</button>
        <button onClick={() => openEdit()}>Edit Selected</button>
        <button onClick={deleteSelected}>Delete Selected</button>
        <button onClick={loadInventory}>Refresh</button>
      </div>

      {error ? <div style={{ color: '#b42318' }}>{error}</div> : null}
      {loading ? <div>Loading inventory...</div> : null}

      {showForm ? (
        <form onSubmit={submitForm} style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12, background: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>{mode === 'add' ? 'Add New Inventory Item' : 'Edit Inventory Item'}</h3>
          <div style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
            <label>
              Resource Name
              <input
                type="text"
                value={form.resource_name}
                onChange={(e) => setForm((prev) => ({ ...prev, resource_name: e.target.value }))}
                required
              />
            </label>
            <label>
              Quantity
              <input
                type="number"
                min="0"
                step="1"
                value={form.quantity_available}
                onChange={(e) => setForm((prev) => ({ ...prev, quantity_available: e.target.value }))}
                required
              />
            </label>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button type="submit">Save</button>
            <button type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Inventory ID</th>
            <th style={{ textAlign: 'left' }}>Resource Name</th>
            <th style={{ textAlign: 'left' }}>Quantity Available</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isSelected = Number(item.inventory_id) === Number(selectedId);
            return (
              <tr
                key={item.inventory_id}
                onClick={() => setSelectedId(item.inventory_id)}
                onDoubleClick={() => openEdit(item)}
                style={{ background: isSelected ? '#e6f7ff' : 'transparent', cursor: 'pointer' }}
              >
                <td>{item.inventory_id}</td>
                <td>{item.resource_name}</td>
                <td>{item.quantity_available}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
