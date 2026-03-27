import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest, unwrapList } from './managerApi.js';

const CATEGORIES = ['Milk Tea', 'Fruit Tea', 'Smoothies', 'Lattes', 'Specialty', 'Seasonal'];

const cardStyle = {
  border: '1px solid #ddd',
  borderRadius: 6,
  padding: 12,
  background: '#fff',
};

function parseMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '$0.00';
  return `$${n.toFixed(2)}`;
}

export default function MenuManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('add');
  const [form, setForm] = useState({ menu_item_id: '', name: '', cost: '', category: CATEGORIES[0] });

  const selected = useMemo(
    () => items.find((item) => Number(item.menu_item_id) === Number(selectedId)) || null,
    [items, selectedId],
  );

  async function loadMenuItems() {
    setLoading(true);
    setError('');
    try {
      const payload = await apiRequest('/menu/items');
      const rows = unwrapList(payload, 'menuItems').map((row) => ({
        menu_item_id: row.menu_item_id ?? row.menuItemId ?? row.id,
        name: row.name,
        cost: Number(row.cost ?? row.price ?? 0),
        category: row.category || 'Uncategorized',
      }));
      setItems(rows);
    } catch (err) {
      setError(err.message || 'Failed to load menu items');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMenuItems();
  }, []);

  function openAdd() {
    setMode('add');
    setForm({ menu_item_id: '', name: '', cost: '', category: CATEGORIES[0] });
    setShowForm(true);
  }

  function openEdit(item = selected) {
    if (!item) {
      alert('Please select a menu item to edit.');
      return;
    }
    setMode('edit');
    setForm({
      menu_item_id: item.menu_item_id,
      name: item.name,
      cost: String(item.cost ?? ''),
      category: item.category || CATEGORIES[0],
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const name = form.name.trim();
    const cost = Number(form.cost);
    if (!name || Number.isNaN(cost) || cost < 0) {
      alert('Please enter a valid name and non-negative price.');
      return;
    }

    const body = { name, cost, category: form.category };

    try {
      if (mode === 'add') {
        await apiRequest('/menu/items', { method: 'POST', body: JSON.stringify(body) });
      } else {
        await apiRequest(`/menu/items/${form.menu_item_id}`, { method: 'PUT', body: JSON.stringify(body) });
      }
      setShowForm(false);
      await loadMenuItems();
    } catch (err) {
      alert(err.message || 'Failed to save menu item.');
    }
  }

  async function deleteSelected() {
    if (!selected) {
      alert('Please select a menu item to delete.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete '${selected.name}'?`)) {
      return;
    }

    try {
      await apiRequest(`/menu/items/${selected.menu_item_id}`, { method: 'DELETE' });
      setSelectedId(null);
      await loadMenuItems();
    } catch (err) {
      alert(err.message || 'Failed to delete menu item. It may still be referenced by orders.');
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0 }}>Manager View - Menu Management</h2>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={openAdd}>Add New Item</button>
        <button onClick={() => openEdit()}>Edit Selected</button>
        <button onClick={deleteSelected}>Delete Selected</button>
        <button onClick={loadMenuItems}>Refresh</button>
      </div>

      {error ? <div style={{ color: '#b42318' }}>{error}</div> : null}
      {loading ? <div>Loading menu items...</div> : null}

      {showForm ? (
        <form onSubmit={handleSubmit} style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>{mode === 'add' ? 'Add New Menu Item' : 'Edit Menu Item'}</h3>
          <div style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
            <label>
              Item Name
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>
            <label>
              Price
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost}
                onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
                required
              />
            </label>
            <label>
              Category
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
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
            <th style={{ textAlign: 'left' }}>Menu Item ID</th>
            <th style={{ textAlign: 'left' }}>Name</th>
            <th style={{ textAlign: 'left' }}>Cost</th>
            <th style={{ textAlign: 'left' }}>Category</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isSelected = Number(item.menu_item_id) === Number(selectedId);
            return (
              <tr
                key={item.menu_item_id}
                onClick={() => setSelectedId(item.menu_item_id)}
                onDoubleClick={() => openEdit(item)}
                style={{
                  background: isSelected ? '#e6f7ff' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <td>{item.menu_item_id}</td>
                <td>{item.name}</td>
                <td>{parseMoney(item.cost)}</td>
                <td>{item.category}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
