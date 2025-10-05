import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const DEFAULT_ROLE = 'STAFF';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', role: DEFAULT_ROLE });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await signup({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message || 'Unable to create account');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg rounded-2xl border-2 border-border bg-card shadow-retro p-8">
        <h1 className="text-2xl font-display tracking-[0.2em] text-center uppercase mb-6">Create Account</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Provision the first My-Desk administrator or register a new teammate.
        </p>
        {error && (
          <div className="mb-4 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="fullName" className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2">
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
                placeholder="Jane Doe"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2">
                Work Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-md border-2 border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-md border-2 border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Minimum 8 characters"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full rounded-md border-2 border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Repeat password"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="role" className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2">
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
              <p className="mt-2 text-xs text-muted-foreground">
                Existing admins can promote roles later from the Employees section.
              </p>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Creating…' : 'Create Account'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link className="text-primary hover:underline" to="/login">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
