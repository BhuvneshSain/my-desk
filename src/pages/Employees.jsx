import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext.jsx';

const EMPTY_FORM = {
  fullName: '',
  email: '',
  password: '',
  role: 'STAFF',
  workInchargeId: '',
};

function sortEmployees(list) {
  return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');

  const canManage = user?.role === 'ADMIN' || user?.role === 'INCHARGE';

  const resetModal = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setModalOpen(false);
    setSubmitting(false);
  };

  const loadEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await api.getEmployees();
      setEmployees(sortEmployees(list));
    } catch (err) {
      setError(err?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setMessage('');
    setForm(EMPTY_FORM);
    setEditing(null);
    setModalOpen(true);
  };

  const openEditModal = (employee) => {
    setMessage('');
    setEditing(employee);
    setForm({
      fullName: employee.fullName,
      email: employee.email,
      password: '',
      role: employee.role,
      workInchargeId: employee.workInchargeId || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      if (editing) {
        const payload = {
          fullName: form.fullName.trim(),
          role: form.role,
          workInchargeId: form.workInchargeId || null,
        };
        const updated = await api.updateEmployee(editing.id, payload);
        setEmployees((prev) => sortEmployees(prev.map((item) => (item.id === updated.id ? updated : item))));
        setMessage('Employee updated successfully.');
      } else {
        const payload = {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          workInchargeId: form.workInchargeId || null,
        };
        const created = await api.createEmployee(payload);
        setEmployees((prev) => sortEmployees([...prev, created]));
        setMessage('Employee created successfully.');
      }
      resetModal();
    } catch (err) {
      setError(err?.message || 'Unable to save employee');
      setSubmitting(false);
    }
  };

  const handleDelete = async (employee) => {
    if (!window.confirm(`Delete ${employee.fullName}?`)) return;
    try {
      await api.deleteEmployee(employee.id);
      setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
      setMessage('Employee deleted.');
    } catch (err) {
      setError(err?.message || 'Failed to delete employee');
    }
  };

  const availableIncharges = useMemo(() => employees.filter((emp) => emp.role !== 'STAFF'), [employees]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display tracking-[0.3em] uppercase">Employees</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage users, their roles, and incharge assignments.</p>
        </div>
        {canManage && (
          <button
            onClick={openCreateModal}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-primary-foreground hover:bg-primary/90"
          >
            Add Employee
          </button>
        )}
      </div>

      {message && (
        <div className="rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-md border border-border px-4 py-6 text-sm text-muted-foreground">Loading employees…</div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-secondary/60">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Work Incharge</th>
                {canManage && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((employee) => (
                <tr key={employee.id} className="text-sm">
                  <td className="px-4 py-3 text-foreground">{employee.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{employee.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full border border-border px-2 py-1 text-xs font-medium uppercase tracking-[0.2em] text-foreground">
                      {employee.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {employees.find((item) => item.id === employee.workInchargeId)?.fullName || '—'}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(employee)}
                        className="rounded-md border border-border px-3 py-1 text-xs uppercase tracking-[0.3em] text-foreground hover:bg-secondary"
                      >
                        Edit
                      </button>
                      {user?.id !== employee.id && (
                        <button
                          onClick={() => handleDelete(employee)}
                          className="rounded-md border border-destructive px-3 py-1 text-xs uppercase tracking-[0.3em] text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No employees yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border-2 border-border bg-card p-6 shadow-retro">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-display tracking-[0.3em] uppercase">
                {editing ? 'Edit Employee' : 'Add Employee'}
              </h2>
              <button onClick={resetModal} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2" htmlFor="fullName">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={form.fullName}
                    onChange={handleChange}
                    className="w-full rounded-md border-2 border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    disabled={Boolean(editing)}
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-md border-2 border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                  />
                </div>
                {!editing && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2" htmlFor="password">
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        value={form.password}
                        onChange={handleChange}
                        className="w-full rounded-md border-2 border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2" htmlFor="role">
                        Role
                      </label>
                      <select
                        id="role"
                        name="role"
                        value={form.role}
                        onChange={handleChange}
                        className="w-full rounded-md border-2 border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <option value="STAFF">Staff</option>
                        <option value="INCHARGE">Incharge</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </>
                )}
                {editing && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2" htmlFor="role">
                      Role
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      className="w-full rounded-md border-2 border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="STAFF">Staff</option>
                      <option value="INCHARGE">Incharge</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2" htmlFor="workInchargeId">
                    Work Incharge
                  </label>
                  <select
                    id="workInchargeId"
                    name="workInchargeId"
                    value={form.workInchargeId}
                    onChange={handleChange}
                    className="w-full rounded-md border-2 border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">None</option>
                    {availableIncharges
                      .filter((emp) => !editing || emp.id !== editing.id)
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetModal}
                  className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
