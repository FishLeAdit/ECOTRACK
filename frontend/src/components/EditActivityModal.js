import React, { useState } from 'react';

const inputStyle = {
  width: '100%',
  padding: 10,
  border: '2px solid var(--border)',
  borderRadius: 8,
  fontSize: 15
};

const labelStyle = { display: 'block', marginBottom: 6, color: 'var(--text-soft)', fontSize: 14 };

function EditActivityModal({ activity, categories, saving, onSave, onClose }) {
  const [name, setName] = useState(activity.activityName);
  const [points, setPoints] = useState(String(activity.points));
  const [category, setCategory] = useState(activity.category || 'General');
  const [co2, setCo2] = useState(typeof activity.co2Kg === 'number' ? String(activity.co2Kg) : '');
  const [error, setError] = useState('');

  const submit = e => {
    e.preventDefault();
    const trimmed = name.trim();
    const pointsNumber = Number(points);
    if (!trimmed) return setError('Activity name is required');
    if (trimmed.length > 100) return setError('Activity name must be 100 characters or fewer');
    if (!Number.isInteger(pointsNumber) || pointsNumber === 0) return setError('Points must be a non-zero whole number');
    if (Math.abs(pointsNumber) > 1000) return setError('Points must be between -1000 and 1000');
    if (co2 !== '' && !Number.isFinite(Number(co2))) return setError('CO₂ must be a number');

    setError('');
    // A blank CO₂ field asks the server to estimate it from the points
    onSave(activity._id, {
      activityName: trimmed,
      points: pointsNumber,
      category,
      co2Kg: co2 === '' ? null : Number(co2)
    });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2500,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit activity"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', color: 'var(--text)', padding: '26px 22px', borderRadius: 14,
          width: 'min(100%, 420px)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.35)'
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 18, color: 'var(--text)' }}>✏️ Edit activity</h2>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="edit-name">Activity name</label>
            <input id="edit-name" value={name} onChange={e => setName(e.target.value)} maxLength={100} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ flex: '1 1 120px' }}>
              <label style={labelStyle} htmlFor="edit-points">Points</label>
              <input id="edit-points" type="number" step="1" value={points} onChange={e => setPoints(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label style={labelStyle} htmlFor="edit-co2">CO₂ kg (estimate)</label>
              <input
                id="edit-co2"
                type="number"
                step="any"
                placeholder="auto"
                value={co2}
                onChange={e => setCo2(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle} htmlFor="edit-category">Category</label>
            <select id="edit-category" value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {error && (
            <p role="alert" style={{ color: 'var(--neg)', margin: '0 0 14px 0', fontSize: 14 }}>⚠️ {error}</p>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '11px 0', border: 'none', borderRadius: 8, background: 'var(--track)', color: 'var(--text)', cursor: 'pointer', fontSize: 15 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1, padding: '11px 0', border: 'none', borderRadius: 8, background: 'var(--pos)', color: 'white',
                cursor: saving ? 'wait' : 'pointer', fontSize: 15, fontWeight: 'bold', opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditActivityModal;
