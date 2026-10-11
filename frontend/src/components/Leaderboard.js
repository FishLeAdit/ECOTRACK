import React, { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api';
import { useAuth } from '../AuthContext';
import { ErrorBanner, Spinner } from './ui';
import AnimatedNumber from './AnimatedNumber';

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function Leaderboard({ onBack }) {
  const { user } = useAuth();
  const [board, setBoard] = useState('points'); // 'points' | 'badges'
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setRows(null);
    setError('');
    try {
      const res = await api.get(`/api/leaderboard/${board}`);
      setRows(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load the leaderboard.'));
    }
  }, [board]);

  useEffect(() => { load(); }, [load]);

  const tab = active => ({
    padding: '8px 18px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    background: active ? 'var(--accent)' : 'var(--track)',
    color: active ? 'white' : 'var(--text)'
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={onBack}
          style={{ padding: '10px 15px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, color: 'var(--text)' }}>🏆 Leaderboard</h2>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setBoard('points')} style={tab(board === 'points')}>By points</button>
        <button onClick={() => setBoard('badges')} style={tab(board === 'badges')}>By badges</button>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}
      {!error && rows === null && <Spinner label="Loading leaderboard…" />}

      {rows && rows.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 40, color: 'var(--text-soft)', backgroundColor: 'var(--surface-alt)',
          borderRadius: 12, border: '2px dashed var(--border)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
          <p style={{ fontSize: 18, margin: '0 0 8px 0' }}>Nobody is on the board yet!</p>
          <p style={{ fontSize: 14, margin: 0 }}>
            Create your own account and log some activities to claim the top spot. The shared demo account isn't ranked.
          </p>
        </div>
      )}

      {rows && rows.length > 0 && (
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
          {rows.map((row, index) => {
            const isMe = row.userId === user.id;
            return (
              <li
                key={row.userId}
                className="fade-up hover-lift"
                style={{
                  '--i': index,
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12,
                  background: isMe ? 'var(--pos-bg)' : 'var(--surface)',
                  border: `2px solid ${isMe ? 'var(--pos)' : 'var(--border)'}`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                }}
              >
                <div style={{ fontSize: 24, width: 40, textAlign: 'center', fontWeight: 'bold', color: 'var(--text)' }}>
                  {MEDALS[row.rank] || `#${row.rank}`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--text)', overflowWrap: 'anywhere' }}>
                    {row.username}{isMe && ' (you)'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {board === 'points'
                      ? `🔥 ${row.currentStreak}-day streak · ${row.totalActivities} activities`
                      : `${row.rareCount} rare · ${row.epicCount} epic · ${row.legendaryCount} legendary`}
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--text)', textAlign: 'right' }}>
                  {board === 'points'
                    ? <><AnimatedNumber value={row.totalPoints} /> pts</>
                    : <><AnimatedNumber value={row.badgeCount} /> 🏅</>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default Leaderboard;
