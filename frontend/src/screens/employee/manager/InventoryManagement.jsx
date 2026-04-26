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
    setError('');
    setShowForm(true);
  }

  function openEdit(item = selected) {
    if (!item) {
      setError('Please select an inventory item to edit.');
      return;
    }
    setMode('edit');
    setForm({
      inventory_id: item.inventory_id,
      resource_name: item.resource_name,
      quantity_available: String(item.quantity_available),
    });
    setError('');
    setShowForm(true);
  }

  async function submitForm(e) {
    e.preventDefault();

    const resource_name = form.resource_name.trim();
    const quantity_available = Number(form.quantity_available);

    if (!resource_name || Number.isNaN(quantity_available) || quantity_available < 0) {
      setError('Please enter a valid resource name and non-negative quantity.');
      return;
    }

    const body = { resource_name, quantity_available };

    try {
      if (mode === 'add') {
        await apiRequest('/inventory', { method: 'POST', body: JSON.stringify(body) });
      } else {
        await apiRequest(`/inventory/${form.inventory_id}`, { method: 'PUT', body: JSON.stringify(body) });
      }
      setError('');
      setShowForm(false);
      await loadInventory();
    } catch (err) {
      setError(err.message || 'Failed to save inventory item.');
    }
  }

  async function deleteSelected() {
    if (!selected) {
      setError('Please select an inventory item to delete.');
      return;
    }

    try {
      await apiRequest(`/inventory/${selected.inventory_id}`, { method: 'DELETE' });
      setError('');
      setSelectedId(null);
      await loadInventory();
    } catch (err) {
      setError(err.message || 'Failed to delete inventory item.');
    }
  }

  return (
    <div className="manager-panel">
      <h2>Inventory Management</h2>

      <div className="manager-actions">
        <button onClick={openAdd} className="manager-btn manager-btn-primary">Add Item</button>
        <button onClick={() => openEdit()} className="manager-btn manager-btn-secondary">Edit Selected</button>
        <button onClick={deleteSelected} className="manager-btn manager-btn-danger">Delete Selected</button>
        <button onClick={loadInventory} className="manager-btn manager-btn-secondary">Refresh</button>
      </div>

      {error ? <div className="manager-error">{error}</div> : null}
      {loading ? <div>Loading inventory...</div> : null}

      {showForm ? (
        <form onSubmit={submitForm} className="manager-form">
          <h3>{mode === 'add' ? 'Add New Inventory Item' : 'Edit Inventory Item'}</h3>
          <div className="manager-form-grid">
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
          <div className="manager-form-actions">
            <button type="submit" className="manager-btn manager-btn-primary">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="manager-btn manager-btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <table className="manager-table">
        <thead>
          <tr>
            <th>Inventory ID</th>
            <th>Resource Name</th>
            <th>Quantity Available</th>
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
                className={isSelected ? 'selected' : ''}
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
