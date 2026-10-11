import React, { useEffect, useState } from 'react';
import { subscribeSlow } from '../api';

// Shown when a request has been pending for a few seconds, which on free hosting usually
// means the server is waking up from sleep.
function ServerWakingBanner() {
  const [slow, setSlow] = useState(false);

  useEffect(() => subscribeSlow(setSlow), []);

  if (!slow) return null;
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 6000,
        background: '#f39c12',
        color: '#2c3e50',
        textAlign: 'center',
        padding: '10px 16px',
        fontSize: 14,
        fontWeight: 'bold',
        boxShadow: '0 2px 10px rgba(0,0,0,0.25)'
      }}
    >
      ⏳ Waking up the server (free hosting) — this can take up to a minute…
    </div>
  );
}

export default ServerWakingBanner;
