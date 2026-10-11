import React, { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api';
import { ErrorBanner, Spinner } from './ui';
import AnimatedNumber from './AnimatedNumber';

// Net CO2e: positive = saved, negative = emitted
function Figure({ label, kg }) {
  const color = kg > 0 ? '#2ecc71' : kg < 0 ? '#ff7675' : 'inherit';
  return (
    <div style={{ textAlign: 'center', flex: '1 1 110px' }}>
      <div style={{ fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 'bold', color }}>
        <AnimatedNumber value={kg} decimals={1} signed suffix=" kg" />
      </div>
      <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ImpactSummary({ refreshKey }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/summary');
      setSummary(res.data);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your impact summary.'));
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (error && !summary) return <ErrorBanner message={error} onRetry={load} />;
  if (!summary) return <Spinner label="Loading your impact…" />;

  return (
    <div className="fade-up" style={{
      background: 'linear-gradient(135deg, #1e8449, #27ae60)',
      color: 'white',
      borderRadius: 15,
      padding: '20px 18px',
      marginBottom: 30,
      boxShadow: '0 6px 20px rgba(39, 174, 96, 0.3)'
    }}>
      <h2 style={{ margin: '0 0 4px 0', fontSize: 20 }}>🌱 Your Impact</h2>
      <p style={{ margin: '0 0 16px 0', fontSize: 12, opacity: 0.85 }}>
        CO₂ saved, net of emissions. These are rough estimates, not exact measurements.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' }}>
        <Figure label="Today" kg={summary.co2.today} />
        <Figure label="Last 7 days" kg={summary.co2.week} />
        <Figure label="All time" kg={summary.co2.allTime} />
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 14,
        justifyContent: 'space-around',
        marginTop: 18,
        paddingTop: 16,
        borderTop: '1px solid rgba(255,255,255,0.3)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>🔥 <AnimatedNumber value={summary.streak.current} /></div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Day streak</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>🏅 <AnimatedNumber value={summary.streak.longest} /></div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Longest streak</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>📋 <AnimatedNumber value={summary.totalActivities} /></div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Activities logged</div>
        </div>
      </div>
      {error && <p style={{ margin: '12px 0 0 0', fontSize: 12 }}>⚠️ {error}</p>}
    </div>
  );
}

export default ImpactSummary;
