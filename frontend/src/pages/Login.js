import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { getErrorMessage } from '../api';
import { ErrorBanner } from '../components/ui';

function Login() {
  const { login, register, loginAsDemo } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async action => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not sign in. Please try again.'));
      setBusy(false);
    }
    // On success AuthContext swaps this page out, so there is nothing to reset
  };

  const submit = e => {
    e.preventDefault();
    run(() => (mode === 'login' ? login(username, password) : register(username, password)));
  };

  const inputStyle = {
    width: '100%',
    padding: 12,
    border: '2px solid var(--border)',
    borderRadius: 8,
    fontSize: 15
  };

  const tab = active => ({
    flex: 1,
    padding: '10px 0',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 'bold',
    background: active ? 'var(--accent)' : 'var(--track)',
    color: active ? 'white' : 'var(--text)'
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <button
        onClick={toggleTheme}
        aria-label="Toggle dark mode"
        style={{
          position: 'fixed', top: 12, right: 12, padding: '8px 12px', border: 'none', borderRadius: 8,
          cursor: 'pointer', background: 'var(--track)', color: 'var(--text)', fontSize: 16
        }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="fade-up" style={{
        width: 'min(100%, 420px)',
        background: 'var(--surface)',
        borderRadius: 16,
        padding: '32px 26px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h1 style={{ margin: '0 0 6px 0', color: 'var(--text)' }}><span className="float">🌍</span> EcoTrack</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Track your daily environmental impact</p>
        </div>

        {/* The quickest way in: a shared account that anyone can use to try the app */}
        <button
          onClick={() => run(loginAsDemo)}
          disabled={busy}
          style={{
            width: '100%',
            padding: '14px 0',
            background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            fontSize: 17,
            fontWeight: 'bold',
            cursor: busy ? 'wait' : 'pointer',
            opacity: busy ? 0.7 : 1
          }}
        >
          🚀 Try the demo
        </button>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 20px 0', textAlign: 'center' }}>
          Explore with sample data and add your own. The demo is shared by everyone and resets every few hours.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 18px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          or use your own account
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button type="button" onClick={() => { setMode('login'); setError(''); }} style={tab(mode === 'login')}>Log in</button>
          <button type="button" onClick={() => { setMode('register'); setError(''); }} style={tab(mode === 'register')}>Register</button>
        </div>

        <form onSubmit={submit}>
          <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-soft)', fontSize: 14 }} htmlFor="username">Username</label>
          <input
            id="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={30}
            required
            style={{ ...inputStyle, marginBottom: 14 }}
          />
          <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-soft)', fontSize: 14 }} htmlFor="password">
            Password {mode === 'register' && <span style={{ color: 'var(--text-muted)' }}>(at least 8 characters)</span>}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'register' ? 8 : undefined}
            maxLength={72}
            required
            style={{ ...inputStyle, marginBottom: 16 }}
          />

          <ErrorBanner message={error} />

          <button
            type="submit"
            disabled={busy}
            style={{
              width: '100%',
              padding: '12px 0',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 'bold',
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.7 : 1
            }}
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
