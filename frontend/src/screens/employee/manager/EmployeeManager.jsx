import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest, unwrapList } from './managerApi.js';

export default function EmployeeManager() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('add');
  const [form, setForm] = useState({ employee_id: '', name: '', position: '', hire_date: '', google_email: '', employee_pin: '' });

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
        google_email: row.google_email ?? '',
        employee_pin: row.employee_pin ?? '',
        pin_set: row.pin_set === true || row.pin_set === 't' || row.pin_set === 1 || row.pin_set === '1',
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
    setForm({ employee_id: '', name: '', position: '', hire_date: '', google_email: '', employee_pin: '' });
    setError('');
    setShowForm(true);
  }

  function openEdit(employee = selected) {
    if (!employee) {
      setError('Please select an employee to edit.');
      return;
    }
    setMode('edit');
    setForm({
      employee_id: employee.employee_id,
      name: employee.name,
      position: employee.position,
      hire_date: employee.hire_date,
      google_email: employee.google_email ?? '',
      employee_pin: employee.employee_pin ?? '',
    });
    setError('');
    setShowForm(true);
  }

  async function saveEmployee(e) {
    e.preventDefault();

    const employeeId = Number(form.employee_id);
    if (mode === 'add' && (Number.isNaN(employeeId) || employeeId <= 0)) {
      setError('Employee ID must be a positive number.');
      return;
    }

    if (!form.name.trim() || !form.position.trim() || !form.hire_date) {
      setError('Please fill in all fields.');
      return;
    }

    const pin = String(form.employee_pin || '').trim();
    if (pin && !/^\d{4}$/.test(pin)) {
      setError('Employee PIN must be exactly 4 digits.');
      return;
    }

    const body = {
      employee_id: employeeId,
      name: form.name.trim(),
      position: form.position.trim(),
      hire_date: form.hire_date,
      google_email: form.google_email.trim() || null,
    };
    if (mode === 'add' && pin) {
      body.employee_pin = pin;
    }
    if (mode === 'edit' && pin) {
      body.employee_pin = pin;
    }

    try {
      if (mode === 'add') {
        await apiRequest('/employees', { method: 'POST', body: JSON.stringify(body) });
      } else {
        await apiRequest(`/employees/${form.employee_id}`, { method: 'PUT', body: JSON.stringify(body) });
      }
      setError('');
      setShowForm(false);
      await loadEmployees();
    } catch (err) {
      setError(err.message || 'Failed to save employee.');
    }
  }

  async function deleteSelected() {
    if (!selected) {
      setError('Please select an employee to delete.');
      return;
    }

    try {
      await apiRequest(`/employees/${selected.employee_id}`, { method: 'DELETE' });
      setError('');
      setSelectedId(null);
      await loadEmployees();
    } catch (err) {
      setError(err.message || 'Failed to delete employee.');
    }
  }

  return (
    <div className="manager-panel">
      <h2>Employee Management</h2>

      <div className="manager-actions">
        <button onClick={openAdd} className="manager-btn manager-btn-primary">Add Employee</button>
        <button onClick={() => openEdit()} className="manager-btn manager-btn-secondary">Edit Selected</button>
        <button onClick={deleteSelected} className="manager-btn manager-btn-danger">Delete Selected</button>
        <button onClick={loadEmployees} className="manager-btn manager-btn-secondary">Refresh</button>
      </div>

      {error ? <div className="manager-error">{error}</div> : null}
      {loading ? <div>Loading employees...</div> : null}

      {showForm ? (
        <form onSubmit={saveEmployee} className="manager-form">
          <h3>{mode === 'add' ? 'Add New Employee' : 'Edit Employee'}</h3>
          <div className="manager-form-grid">
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
              <select
                value={form.position}
                onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
                required
              >
                <option value="">Select position</option>
                <option value="Cashier">Cashier</option>
                <option value="Manager">Manager</option>
              </select>
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
            <label>
              Google Email (for login)
              <input
                type="email"
                placeholder="employee@gmail.com"
                value={form.google_email}
                onChange={(e) => setForm((prev) => ({ ...prev, google_email: e.target.value }))}
              />
            </label>
            <label>
              4-Digit PIN (for PIN login)
              <input
                type={mode === 'edit' ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                placeholder={mode === 'edit' ? '4-digit PIN' : 'Enter 4-digit PIN'}
                value={form.employee_pin}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  employee_pin: e.target.value.replace(/\D/g, '').slice(0, 4),
                }))}
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
            <th>Employee ID</th>
            <th>Name</th>
            <th>Position</th>
            <th>Hire Date</th>
            <th>Google Email</th>
            <th>PIN</th>
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
                className={isSelected ? 'selected' : ''}
              >
                <td>{employee.employee_id}</td>
                <td>{employee.name}</td>
                <td>{employee.position}</td>
                <td>{employee.hire_date}</td>
                <td>{employee.google_email || <span style={{ color: '#aaa' }}>Not set</span>}</td>
                <td>{employee.pin_set ? '****' : <span style={{ color: '#aaa' }}>Not set</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
