import React, { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../api';
import { ErrorBanner, ProgressBar, Spinner } from './ui';
import AnimatedNumber from './AnimatedNumber';

function GoalHistory({ onBack }) {
  const [goalHistory, setGoalHistory] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'successful', 'failed'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchGoalHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/goals/history');
      setGoalHistory(response.data);
      setError('');
    } catch (err) {
      console.error('❌ Error fetching goal history:', err);
      setError(getErrorMessage(err, 'Could not load your goal history.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoalHistory();
  }, [fetchGoalHistory]);

  const filteredGoals = goalHistory.filter(goal => {
    if (filter === 'all') return true;
    if (filter === 'successful') return goal.wasSuccessful;
    if (filter === 'failed') return !goal.wasSuccessful;
    return true;
  });

  const getStatusIcon = (wasSuccessful) => {
    return wasSuccessful ? '🎉' : '💔';
  };

  const getStatusColor = (wasSuccessful) => {
    return wasSuccessful ? '#27ae60' : '#e74c3c';
  };

  const getStatusText = (wasSuccessful) => {
    return wasSuccessful ? 'SUCCESS' : 'FAILED';
  };

  if (loading) {
    return <Spinner label="Loading goal history…" />;
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <button
          onClick={onBack}
          style={{ padding: '10px 15px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}
        >
          ← Back
        </button>
        <ErrorBanner message={error} onRetry={fetchGoalHistory} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '30px',
        gap: '20px'
      }}>
        <button
          onClick={onBack}
          style={{
            padding: '10px 15px',
            backgroundColor: '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'background-color 0.3s ease'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#7f8c8d'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#95a5a6'}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, color: 'var(--text)' }}>📚 Goal History</h1>
      </div>

      <button 
        onClick={fetchGoalHistory}
        style={{
          padding: '8px 16px',
          backgroundColor: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        🔄 Refresh History
      </button>

      {/* Filter Controls */}
      <div style={{ 
        marginBottom: '30px',
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <span style={{ color: 'var(--text-soft)', fontSize: '16px' }}>Filter by:</span>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '8px 16px',
            backgroundColor: filter === 'all' ? '#3498db' : 'var(--track)',
            color: filter === 'all' ? 'white' : 'var(--text)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.3s ease'
          }}
        >
          All Goals ({goalHistory.length})
        </button>
        <button
          onClick={() => setFilter('successful')}
          style={{
            padding: '8px 16px',
            backgroundColor: filter === 'successful' ? '#27ae60' : 'var(--track)',
            color: filter === 'successful' ? 'white' : 'var(--text)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.3s ease'
          }}
        >
          Successful ({goalHistory.filter(g => g.wasSuccessful).length})
        </button>
        <button
          onClick={() => setFilter('failed')}
          style={{
            padding: '8px 16px',
            backgroundColor: filter === 'failed' ? '#e74c3c' : 'var(--track)',
            color: filter === 'failed' ? 'white' : 'var(--text)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.3s ease'
          }}
        >
          Failed ({goalHistory.filter(g => !g.wasSuccessful).length})
        </button>
      </div>

      {/* Goal History List */}
      {filteredGoals.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-soft)',
          backgroundColor: 'var(--surface-alt)',
          borderRadius: '12px',
          border: '2px dashed var(--border)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📚</div>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>
            {filter === 'all' ? 'No goal history yet!' : `No ${filter} goals found`}
          </p>
          <p style={{ fontSize: '14px' }}>
            {filter === 'all' 
              ? 'Complete some goals to see your history here.' 
              : `Try completing some goals to see ${filter} results.`
            }
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {filteredGoals.map((goal, index) => (
            <div key={goal._id} className="fade-up hover-lift" style={{
              '--i': Math.min(index, 10),
              backgroundColor: 'var(--surface)',
              padding: '25px',
              borderRadius: '12px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              border: `3px solid ${getStatusColor(goal.wasSuccessful)}`,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Status Badge (positioned by .goal-status-badge in App.css) */}
              <div className="goal-status-badge" style={{
                padding: '8px 12px',
                backgroundColor: getStatusColor(goal.wasSuccessful),
                color: 'white',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {getStatusIcon(goal.wasSuccessful)} {getStatusText(goal.wasSuccessful)}
              </div>

              {/* Goal Header */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ 
                  margin: '0 0 10px 0', 
                  color: 'var(--text)',
                  fontSize: '22px',
                  textTransform: 'capitalize'
                }}>
                  {goal.goalType} Goal
                </h3>
                <p style={{ 
                  margin: '0', 
                  color: 'var(--text-muted)',
                  fontSize: '16px'
                }}>
                  Completed on {new Date(goal.completionDate).toLocaleDateString()}
                </p>
              </div>

              {/* Goal Details */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-soft)', fontSize: '14px' }}>Target</h4>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
                    <AnimatedNumber value={goal.targetPoints} /> points
                  </p>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-soft)', fontSize: '14px' }}>Achieved</h4>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: goal.wasSuccessful ? '#27ae60' : '#e74c3c'
                  }}>
                    <AnimatedNumber value={goal.currentPoints} /> points
                  </p>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-soft)', fontSize: '14px' }}>Period</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>
                    {new Date(goal.startDate).toLocaleDateString()} - {new Date(goal.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-soft)' }}>
                    Progress: <AnimatedNumber value={goal.currentPoints} /> / {goal.targetPoints} points
                  </span>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold',
                    color: getStatusColor(goal.wasSuccessful)
                  }}>
                    <AnimatedNumber value={Math.round((goal.currentPoints / goal.targetPoints) * 100)} suffix="%" />
                  </span>
                </div>
                <ProgressBar
                  percent={(goal.currentPoints / goal.targetPoints) * 100}
                  color={getStatusColor(goal.wasSuccessful)}
                  height={10}
                  label="Goal progress"
                />
              </div>

              {/* Achievement Message */}
              <div style={{
                padding: '15px',
                backgroundColor: goal.wasSuccessful ? 'var(--pos-soft-bg)' : 'var(--neg-soft-bg)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <span style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: getStatusColor(goal.wasSuccessful)
                }}>
                  {goal.wasSuccessful 
                    ? `🎉 Congratulations! You achieved your ${goal.goalType} goal!` 
                    : `💪 Keep trying! You were ${goal.targetPoints - goal.currentPoints} points short of your ${goal.goalType} goal.`
                  }
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GoalHistory;
