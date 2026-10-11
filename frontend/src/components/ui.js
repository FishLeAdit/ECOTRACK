import React, { useEffect, useMemo, useState } from 'react';

// A bar that fills from empty to `percent` (and glides when the value changes)
export function ProgressBar({ percent, color, height = 8, label }) {
  const [width, setWidth] = useState(0);
  const target = Math.max(0, Math.min(100, percent || 0));

  useEffect(() => {
    // Start from 0 on first paint, then let the CSS transition do the fill
    const id = setTimeout(() => setWidth(target), 60);
    return () => clearTimeout(id);
  }, [target]);

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(target)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      style={{ width: '100%', height, backgroundColor: 'var(--track)', borderRadius: height / 2, overflow: 'hidden' }}
    >
      <div style={{
        width: `${width}%`,
        height: '100%',
        backgroundColor: color,
        borderRadius: height / 2,
        transition: 'width 0.9s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.3s ease'
      }} />
    </div>
  );
}

const CONFETTI_COLORS = ['#27ae60', '#2ecc71', '#f1c40f', '#e67e22', '#3498db', '#9b59b6', '#e74c3c'];

// One-shot confetti burst. Mount it when something worth celebrating happens.
export function Confetti({ pieces = 40 }) {
  const items = useMemo(() => Array.from({ length: pieces }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.8 + Math.random() * 1.6,
    drift: (Math.random() - 0.5) * 220,
    spin: 360 + Math.random() * 720,
    size: 6 + Math.random() * 7,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]
  })), [pieces]);

  return (
    <div className="confetti" aria-hidden="true">
      {items.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            backgroundColor: p.color,
            '--delay': `${p.delay}s`,
            '--dur': `${p.duration}s`,
            '--drift': `${p.drift}px`,
            '--spin': `${p.spin}deg`
          }}
        />
      ))}
    </div>
  );
}

// Placeholder that mimics the dashboard layout while the first load is in flight
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading your dashboard">
      <div className="skeleton" style={{ height: 76, marginBottom: 30 }} />
      <div className="skeleton" style={{ height: 190, marginBottom: 30 }} />
      <div className="skeleton" style={{ height: 24, width: 200, marginBottom: 18 }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 30 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="skeleton" style={{ width: 160, height: 120, flex: '0 0 auto' }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 160 }} />
    </div>
  );
}

export function Spinner({ label = 'Loading…', size = 28 }) {
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 30, color: 'var(--text-soft)' }}>
      <span
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          border: '3px solid var(--track)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'ecotrack-spin 0.8s linear infinite'
        }}
      />
      <span>{label}</span>
    </div>
  );
}

// Inline error with an optional retry button
export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      style={{
        background: 'var(--neg-bg)',
        color: 'var(--neg-text)',
        border: '2px solid var(--neg)',
        borderRadius: 12,
        padding: '14px 18px',
        margin: '12px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap'
      }}
    >
      <span>⚠️ {message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '8px 16px',
            background: 'var(--neg)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}
