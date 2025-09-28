import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.login(username, password);
      navigate('/');
    } catch (e) {
      setError(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-card p-6 rounded-xl border-2 border-border/40 shadow-retro space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-muted-foreground text-sm mt-1">Use your account to continue</p>
        </div>
        {error && (<div className="text-sm text-destructive">{error}</div>)}
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Username</label>
          <input value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full px-3 py-2 rounded-md border border-border/40 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" autoFocus />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Password</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full px-3 py-2 rounded-md border border-border/40 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <div className="text-xs text-muted-foreground mt-1">Default: admin / admin</div>
        </div>
        <button type="submit" disabled={loading} className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground border border-border shadow-retro hover:bg-primary-hover disabled:opacity-50">{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}

