import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest, unwrapList } from './managerApi.js';

export default function EmployeeManager() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('add');
  const [form, setForm] = useState({ employee_id: '', name: '', position: '', hire_date: '' });

  const selected = useMemo(
    () => employees.find((employee) => Number(employee.employee_id) === Number(selectedId)) || null,
    [employees, selectedId],
  );

  async function loadEmployees() {
    setLoading(true);
    setError('');

    try {
      const payload = await apiRequest('/employees');
      const rows = unwrapList(payload, 'employees').map((row) => ({
        employee_id: row.employee_id ?? row.employeeId ?? row.id,
        name: row.name,
        position: row.position,
        hire_date: String(row.hire_date ?? row.hireDate ?? '').slice(0, 10),
      }));
      setEmployees(rows);
    } catch (err) {
      setError(err.message || 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  function openAdd() {
    setMode('add');
    setForm({ employee_id: '', name: '', position: '', hire_date: '' });
    setShowForm(true);
  }

  function openEdit(employee = selected) {
    if (!employee) {
      alert('Please select an employee to edit.');
      return;
    }
    setMode('edit');
    setForm({
      employee_id: employee.employee_id,
      name: employee.name,
      position: employee.position,
      hire_date: employee.hire_date,
    });
    setShowForm(true);
  }

  async function saveEmployee(e) {
    e.preventDefault();

    const employeeId = Number(form.employee_id);
    if (mode === 'add' && (Number.isNaN(employeeId) || employeeId <= 0)) {
      alert('Employee ID must be a positive number.');
      return;
    }

    if (!form.name.trim() || !form.position.trim() || !form.hire_date) {
      alert('Please fill in all fields.');
      return;
    }

    const body = {
      employee_id: employeeId,
      name: form.name.trim(),
      position: form.position.trim(),
      hire_date: form.hire_date,
    };

    try {
      if (mode === 'add') {
        await apiRequest('/employees', { method: 'POST', body: JSON.stringify(body) });
      } else {
        await apiRequest(`/employees/${form.employee_id}`, { method: 'PUT', body: JSON.stringify(body) });
      }
      setShowForm(false);
      await loadEmployees();
    } catch (err) {
      alert(err.message || 'Failed to save employee.');
    }
  }

  async function deleteSelected() {
    if (!selected) {
      alert('Please select an employee to delete.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete '${selected.name}'?`)) {
      return;
    }

    try {
      await apiRequest(`/employees/${selected.employee_id}`, { method: 'DELETE' });
      setSelectedId(null);
      await loadEmployees();
    } catch (err) {
      alert(err.message || 'Failed to delete employee.');
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0 }}>Manager View - Employee Management</h2>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={openAdd}>Add Employee</button>
        <button onClick={() => openEdit()}>Edit Selected</button>
        <button onClick={deleteSelected}>Delete Selected</button>
        <button onClick={loadEmployees}>Refresh</button>
      </div>

      {error ? <div style={{ color: '#b42318' }}>{error}</div> : null}
      {loading ? <div>Loading employees...</div> : null}

      {showForm ? (
        <form onSubmit={saveEmployee} style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12, background: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>{mode === 'add' ? 'Add New Employee' : 'Edit Employee'}</h3>
          <div style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
            <label>
              Employee ID
              <input
                type="number"
                min="1"
                step="1"
                disabled={mode === 'edit'}
                value={form.employee_id}
                onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))}
                required
              />
            </label>
            <label>
              Name
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>
            <label>
              Position
              <input
                type="text"
                value={form.position}
                onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
                required
              />
            </label>
            <label>
              Hire Date (YYYY-MM-DD)
              <input
                type="date"
                value={form.hire_date}
                onChange={(e) => setForm((prev) => ({ ...prev, hire_date: e.target.value }))}
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
            <th style={{ textAlign: 'left' }}>Employee ID</th>
            <th style={{ textAlign: 'left' }}>Name</th>
            <th style={{ textAlign: 'left' }}>Position</th>
            <th style={{ textAlign: 'left' }}>Hire Date</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => {
            const isSelected = Number(employee.employee_id) === Number(selectedId);
            return (
              <tr
                key={employee.employee_id}
                onClick={() => setSelectedId(employee.employee_id)}
                onDoubleClick={() => openEdit(employee)}
                style={{ background: isSelected ? '#e6f7ff' : 'transparent', cursor: 'pointer' }}
              >
                <td>{employee.employee_id}</td>
                <td>{employee.name}</td>
                <td>{employee.position}</td>
                <td>{employee.hire_date}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
