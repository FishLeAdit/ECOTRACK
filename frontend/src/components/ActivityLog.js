import React, { useState } from 'react';
import EditActivityModal from './EditActivityModal';

// Matches the server's fallback for activities logged without a CO2 figure
const CO2_KG_PER_POINT = 0.1;

function co2Of(activity) {
  return typeof activity.co2Kg === 'number' ? activity.co2Kg : activity.points * CO2_KG_PER_POINT;
}

function formatKg(kg) {
  const rounded = Math.round(kg * 100) / 100;
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg CO₂`;
}

const smallButton = (background, color = 'white') => ({
  padding: '8px 12px',
  backgroundColor: background,
  color,
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px'
});

function ActivityLog({
  activities, handleDelete, handleEdit, handleExport, exporting,
  pinnedCustomActivities, pinCustomActivity, unpinCustomActivity,
  positiveActivities, negativeActivities, categories,
  selectedCategoryFilter, setSelectedCategoryFilter
}) {
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const saveEdit = async (id, data) => {
    setSaving(true);
    const ok = await handleEdit(id, data);
    setSaving(false);
    if (ok) setEditing(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--text)', margin: 0 }}>📋 Activity Log</h2>
        <button
          onClick={handleExport}
          disabled={exporting || activities.length === 0}
          style={{
            ...smallButton('var(--accent)'),
            opacity: exporting || activities.length === 0 ? 0.6 : 1,
            cursor: exporting ? 'wait' : activities.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          {exporting ? 'Preparing…' : '⬇️ Export CSV'}
        </button>
      </div>

      {/* Category Filter */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-soft)', fontSize: '14px' }}>Filter by category:</span>
        <select
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '2px solid var(--border)', borderRadius: '6px', fontSize: '14px' }}
        >
          <option value="All">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {activities.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: 'var(--text-soft)',
          backgroundColor: 'var(--surface-alt)',
          borderRadius: '12px',
          border: '2px dashed var(--border)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🌱</div>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>No activities logged yet!</p>
          <p style={{ fontSize: '14px' }}>Start by clicking on an activity above to begin tracking your environmental impact.</p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {activities
            .filter(a => selectedCategoryFilter === 'All' || a.category === selectedCategoryFilter)
            .map((a, index) => {
              // Only show pin button for custom activities (not in predefined lists and not already pinned)
              const isPredefined = positiveActivities.some(p => p.activity === a.activityName) ||
                                   negativeActivities.some(n => n.activity === a.activityName);
              const isPinned = pinnedCustomActivities.some(p => p.activityName === a.activityName);
              const co2 = co2Of(a);

              return (
                <li key={a._id} className="fade-up" style={{
                  '--i': Math.min(index, 12),
                  background: a.points >= 0 ? 'var(--pos-bg)' : 'var(--neg-bg)',
                  color: a.points >= 0 ? 'var(--text)' : 'var(--neg-text)',
                  marginBottom: '15px',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: `2px solid ${a.points >= 0 ? 'var(--pos)' : 'var(--neg)'}`
                }}>
                  <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '20px', marginRight: '10px' }}>
                        {a.points >= 0 ? '🌟' : '⚠️'}
                      </span>
                      <strong style={{ fontSize: '16px', overflowWrap: 'anywhere' }}>{a.activityName}</strong>
                    </div>
                    <div style={{ marginBottom: '5px', display: 'flex', flexWrap: 'wrap', gap: '4px 14px', alignItems: 'baseline' }}>
                      <span style={{ color: a.points >= 0 ? 'var(--pos)' : 'var(--neg)', fontSize: '18px', fontWeight: 'bold' }}>
                        {a.points >= 0 ? `+${a.points}` : `${a.points}`} points
                      </span>
                      <span style={{ fontSize: '13px', opacity: 0.85 }} title="Rough estimate">
                        ≈ {formatKg(co2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
                      <small style={{ color: 'var(--text-soft)', fontSize: '12px' }}>
                        📅 {new Date(a.date).toLocaleString()}
                      </small>
                      {a.category && (
                        <span style={{
                          backgroundColor: a.points >= 0 ? '#27ae60' : '#c0392b',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}>
                          🏷️ {a.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditing(a)} style={smallButton('#3498db')}>
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDelete(a._id)} style={smallButton('#e74c3c')}>
                      🗑️ Delete
                    </button>
                    {/* Pin button for custom activities */}
                    {!isPredefined && !isPinned && (
                      <button
                        onClick={() => pinCustomActivity({
                          activityName: a.activityName,
                          points: a.points,
                          category: a.category,
                          co2Kg: a.co2Kg,
                          emoji: a.emoji || '✨'
                        })}
                        style={{ ...smallButton('#f1c40f', '#2c3e50'), fontSize: '12px' }}
                      >
                        📌 Pin
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
        </ul>
      )}

      {editing && (
        <EditActivityModal
          activity={editing}
          categories={categories}
          saving={saving}
          onSave={saveEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

export default ActivityLog;
