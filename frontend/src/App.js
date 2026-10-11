import React, { useCallback, useEffect, useState } from 'react';
import './App.css';
import api, { getErrorMessage } from './api';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { useToast } from './ToastContext';
import GoalHistory from './components/GoalHistory';
import BadgeNotification from './components/BadgeNotification';
import BadgeDisplay from './components/BadgeDisplay';
import ProgressCharts from './components/ProgressCharts';
import ActivityLog from './components/ActivityLog';
import ImpactSummary from './components/ImpactSummary';
import Leaderboard from './components/Leaderboard';
import { Confetti, DashboardSkeleton, ErrorBanner, ProgressBar } from './components/ui';
import AnimatedNumber from './components/AnimatedNumber';

// Activity box (sizing and the mobile layout live in App.css under .activity-box).
// Defined at module level so React doesn't remount it, and replay its entrance, on every App render.
function ActivityBox({ activity, points, emoji, category, co2Kg, index = 0, onClick }) {
  return (
    <button
      className={`activity-box fade-up${points > 0 ? '' : ' negative'}`}
      style={{ '--i': index }}
      onClick={() => onClick(activity, points, category, co2Kg)}
    >
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{emoji}</div>
      <div style={{ fontSize: '11px', marginBottom: '4px' }}>{activity}</div>
      <div style={{ fontSize: '9px', marginBottom: '4px' }}>{category || 'General'}</div>
      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
        {points > 0 ? `+${points}` : points}
      </div>
    </button>
  );
}

function App() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  // State declarations
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // Bumped after every change so the badge, chart and impact panels re-fetch
  const [dataVersion, setDataVersion] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [activities, setActivities] = useState([]);
  const [customActivity, setCustomActivity] = useState('');
  const [customPoints, setCustomPoints] = useState('');
  const [customCo2, setCustomCo2] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const [customCategory, setCustomCategory] = useState('General');
  const [totalScore, setTotalScore] = useState(0);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [goals, setGoals] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    targetPoints: '',
    goalType: 'daily',
    endDate: getEndDateForGoalType('daily')
  });
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState('main');
  const [newBadges, setNewBadges] = useState([]);
  const [showBadgeNotification, setShowBadgeNotification] = useState(false);
  const [pinnedCustomActivities, setPinnedCustomActivities] = useState([]);
  const [completedGoal, setCompletedGoal] = useState(null);
  const [showGoalCompleteNotification, setShowGoalCompleteNotification] = useState(false);

  // Categories
  const categories = [
    'General',
    'Transportation',
    'Energy',
    'Waste',
    'Food',
    'Water',
    'Shopping',
    'Home',
    'Work',
    'Recreation'
  ];

  // Predefined activities. co2Kg is a rough per-action estimate of CO2e saved (+) or emitted (-).
  const [positiveActivities] = useState([
    { activity: "Walked instead of driving", points: 4, emoji: "🚶", category: "Transportation", co2Kg: 0.4 },
    { activity: "Used Bicycle", points: 5, emoji: "🚴", category: "Transportation", co2Kg: 1.0 },
    { activity: "Used Public Transport", points: 3, emoji: "🚌", category: "Transportation", co2Kg: 1.5 },
    { activity: "Recycled Waste", points: 3, emoji: "♻️", category: "Waste", co2Kg: 0.5 },
    { activity: "Planted a Tree", points: 10, emoji: "🌱", category: "General", co2Kg: 20 },
    { activity: "Used Reusable Bottle", points: 2, emoji: "💧", category: "Water", co2Kg: 0.08 },
    { activity: "Reduced Electricity Usage", points: 4, emoji: "💡", category: "Energy", co2Kg: 0.4 },
    { activity: "Bought Local Produce", points: 2, emoji: "🥬", category: "Food", co2Kg: 0.5 },
    { activity: "Composted Kitchen Waste", points: 3, emoji: "🗂️", category: "Waste", co2Kg: 0.3 }
  ]);

  const [negativeActivities] = useState([
    { activity: "Drove Car Alone", points: -5, emoji: "🚗", category: "Transportation", co2Kg: -2.0 },
    { activity: "Used Plastic Bags", points: -2, emoji: "🛍️", category: "Shopping", co2Kg: -0.05 },
    { activity: "Wasted Food", points: -3, emoji: "🗑️", category: "Food", co2Kg: -1.2 },
    { activity: "Left Lights/AC On", points: -4, emoji: "💡", category: "Energy", co2Kg: -1.0 },
    { activity: "Took Short Flight (<500km)", points: -8, emoji: "✈️", category: "Transportation", co2Kg: -90 },
    { activity: "Used Disposable Bottles", points: -2, emoji: "🥤", category: "Water", co2Kg: -0.08 }
  ]);

  // Helper to get end date based on goal type
  function getEndDateForGoalType(goalType) {
    const today = new Date();
    if (goalType === 'daily') {
      today.setDate(today.getDate() + 1);
    } else if (goalType === 'weekly') {
      today.setDate(today.getDate() + 7);
    } else if (goalType === 'monthly') {
      today.setMonth(today.getMonth() + 1);
    }
    return today.toISOString().split('T')[0];
  }

  // Fetch activities from backend (the server returns only the logged-in user's)
  const fetchActivities = useCallback(async () => {
    const response = await api.get('/api/activities');
    setActivities(response.data);
    setTotalScore(response.data.reduce((acc, curr) => acc + curr.points, 0));
  }, []);

  // Fetch goals from backend
  // silent: let the caller report the error (the initial load shows one banner instead of a toast)
  const fetchGoals = useCallback(async ({ silent = false } = {}) => {
    try {
      const response = await api.get('/api/goals');
      setGoals(response.data);
    } catch (err) {
      console.error('❌ Error fetching goals:', err);
      if (silent) throw err;
      toast.error(getErrorMessage(err, 'Could not load your goals.'));
    }
  }, [toast]);

  // First load: activities and goals together, with a retryable error state
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      await Promise.all([fetchActivities(), fetchGoals({ silent: true })]);
    } catch (err) {
      console.error('❌ Error loading data:', err);
      setLoadError(getErrorMessage(err, 'Could not load your data.'));
    } finally {
      setLoading(false);
    }
  }, [fetchActivities, fetchGoals]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Refresh everything that depends on the activity list
  const refreshAll = useCallback(async () => {
    await Promise.all([fetchActivities(), fetchGoals()]);
    setDataVersion(v => v + 1);
  }, [fetchActivities, fetchGoals]);

  const showNewBadges = (badges) => {
    if (badges && badges.length > 0) {
      setNewBadges(badges);
      setShowBadgeNotification(true);
    }
  };

  // Log predefined activity
  const logPredefined = async (activity, points, category, co2Kg) => {
    try {
      const payload = {
        activityName: activity,
        points: points,
        category: category,
        // Undefined for custom pins without a figure, so the server estimates it from the points
        ...(typeof co2Kg === 'number' ? { co2Kg } : {})
      };
      const response = await api.post('/api/activities', payload);
      showNewBadges(response.data.newBadges);
      await updateGoalsProgress(points);
      await refreshAll();
    } catch (err) {
      console.error('❌ Error adding predefined activity:', err);
      toast.error(getErrorMessage(err, 'Could not add that activity.'));
    }
  };

  // Handle custom activity submission
  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!customActivity.trim() || !customPoints) return toast.error('Please fill in the activity name and points.');
    const points = parseInt(customPoints, 10);
    if (!Number.isInteger(points) || points === 0) return toast.error('Points must be a non-zero whole number.');
    try {
      const payload = {
        activityName: customActivity.trim(),
        points,
        category: customCategory,
        ...(customCo2 !== '' && Number.isFinite(Number(customCo2)) ? { co2Kg: Number(customCo2) } : {})
      };
      const response = await api.post('/api/activities', payload);
      showNewBadges(response.data.newBadges);
      await updateGoalsProgress(points);
      await refreshAll();
      setCustomActivity('');
      setCustomPoints('');
      setCustomEmoji('');
      setCustomCo2('');
      setCustomCategory('General');
    } catch (err) {
      console.error('❌ Error adding custom activity:', err);
      toast.error(getErrorMessage(err, 'Could not add that activity.'));
    }
  };

  // Edit an activity. Resolves to true on success so the modal knows whether to close.
  const handleEdit = async (id, data) => {
    try {
      const response = await api.put(`/api/activities/${id}`, data);
      showNewBadges(response.data.newBadges);
      await refreshAll();
      toast.success('Activity updated.');
      return true;
    } catch (err) {
      console.error('❌ Error editing activity:', err);
      toast.error(getErrorMessage(err, 'Could not update that activity.'));
      return false;
    }
  };

  // Download the user's activities as CSV (an authenticated request, so not a plain link)
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/api/activities/export.csv', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ecotrack-activities.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('❌ Error exporting CSV:', err);
      toast.error(getErrorMessage(err, 'Could not export your activities.'));
    } finally {
      setExporting(false);
    }
  };

  // After an activity is logged, check whether a goal was just completed. If so, celebrate
  // and archive it (which also starts the next period).
  const updateGoalsProgress = async () => {
    try {
      const response = await api.get('/api/goals');
      const updatedGoals = response.data;
      setGoals(updatedGoals);

      const completed = updatedGoals.find(goal => goal.isCompleted && !goal.isArchived);
      if (completed) {
        setCompletedGoal(completed);
        setShowGoalCompleteNotification(true);
        setTimeout(async () => {
          setShowGoalCompleteNotification(false);
          setCompletedGoal(null);
          try {
            const archived = await api.put(`/api/goals/${completed._id}/archive`);
            showNewBadges(archived.data.newBadges);
            await refreshAll();
          } catch (archiveErr) {
            console.error('❌ Error archiving goal:', archiveErr);
            toast.error(getErrorMessage(archiveErr, 'Could not archive the completed goal.'));
          }
        }, 3500);
      }
    } catch (err) {
      console.error('❌ Error updating goals progress:', err);
    }
  };

  // Delete activity
  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/activities/${id}`);
      await refreshAll();
    } catch (err) {
      console.error('❌ Error deleting activity:', err);
      toast.error(getErrorMessage(err, 'Could not delete that activity.'));
    }
  };

  // Create new goal
  const createGoal = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/goals', {
        targetPoints: newGoal.targetPoints,
        endDate: newGoal.endDate,
        goalType: newGoal.goalType
      });
      showNewBadges(response.data.newBadges);
      setShowGoalModal(false);
      setNewGoal({ targetPoints: '', goalType: 'daily', endDate: getEndDateForGoalType('daily') });
      await fetchGoals();
      setDataVersion(v => v + 1);
    } catch (err) {
      console.error('❌ Error creating goal:', err);
      toast.error(getErrorMessage(err, 'Could not create that goal.'));
    }
  };

  // Delete goal
  const deleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    try {
      await api.delete(`/api/goals/${goalId}`);
      await fetchGoals();
    } catch (err) {
      console.error('❌ Error deleting goal:', err);
      toast.error(getErrorMessage(err, 'Could not delete that goal.'));
    }
  };

  // Pin a custom activity
  const pinCustomActivity = (activityObj) => {
    const name = activityObj.activityName || activityObj.activity;
    if (!pinnedCustomActivities.some(a => (a.activityName || a.activity) === name)) {
      setPinnedCustomActivities([
        ...pinnedCustomActivities,
        {
          activityName: name,
          points: activityObj.points,
          emoji: activityObj.emoji,
          category: activityObj.category,
          co2Kg: activityObj.co2Kg
        }
      ]);
    }
  };

  // Unpin a custom activity
  const unpinCustomActivity = (activityName) => {
    setPinnedCustomActivities(pinnedCustomActivities.filter(a => a.activityName !== activityName));
  };

  // When opening the modal, set the default end date for the default goal type
  const openGoalModal = () => {
    setShowGoalModal(true);
    setNewGoal({
      targetPoints: '',
      goalType: 'daily',
      endDate: getEndDateForGoalType('daily')
    });
  };

  return (
    <div style={{ maxWidth: 1000, width: '100%', margin: '40px auto', fontFamily: 'Arial, sans-serif', padding: '0 10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
        <button
          onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
          aria-label="Open menu"
          style={{
            padding: '10px',
            backgroundColor: '#34495e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >
          ☰
        </button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>🌍 EcoTrack</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Track your daily environmental impact</p>
        </div>
        <div style={{
          minWidth: '50px',
          maxWidth: '110px',
          textAlign: 'right',
          fontSize: '12px',
          color: 'var(--text-muted)',
          overflowWrap: 'anywhere'
        }}>
          👤 {user.username}
          {user.isDemo && <div style={{ color: '#e67e22', fontWeight: 'bold' }}>demo</div>}
        </div>
      </div>

      {/* Hamburger Menu */}
      {showHamburgerMenu && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000
        }} onClick={() => setShowHamburgerMenu(false)}>
          <div style={{
            position: 'absolute',
            top: '80px',
            left: '20px',
            backgroundColor: 'var(--surface)',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            minWidth: '200px',
            maxWidth: 'calc(100vw - 40px)'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', color: 'var(--text)' }}>Menu</h3>
            <button
              onClick={() => {
                setCurrentPage('main');
                setShowHamburgerMenu(false);
              }}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: currentPage === 'main' ? '#3498db' : 'var(--track)',
                color: currentPage === 'main' ? 'white' : 'var(--text)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                marginBottom: '10px'
              }}
            >
              🏠 Main Dashboard
            </button>
            <button
              onClick={() => {
                setCurrentPage('history');
                setShowHamburgerMenu(false);
              }}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: currentPage === 'history' ? '#3498db' : 'var(--track)',
                color: currentPage === 'history' ? 'white' : 'var(--text)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                marginBottom: '10px'
              }}
            >
              📚 Goal History
            </button>
            <button
              onClick={() => {
                setCurrentPage('log');
                setShowHamburgerMenu(false);
              }}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: currentPage === 'log' ? '#3498db' : 'var(--track)',
                color: currentPage === 'log' ? 'white' : 'var(--text)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📋 Activity Log
            </button>
            <button
              onClick={() => {
                setCurrentPage('leaderboard');
                setShowHamburgerMenu(false);
              }}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: currentPage === 'leaderboard' ? '#3498db' : 'var(--track)',
                color: currentPage === 'leaderboard' ? 'white' : 'var(--text)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                marginTop: '10px'
              }}
            >
              🏆 Leaderboard
            </button>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />
            <button
              onClick={toggleTheme}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--track)',
                color: 'var(--text)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                marginBottom: '10px'
              }}
            >
              {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>
            <button
              onClick={() => {
                setShowHamburgerMenu(false);
                logout();
              }}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🚪 Log out
            </button>
          </div>
        </div>
      )}

      {/* Modal for Adding Goal */}
      {showGoalModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--surface)',
            padding: '30px 25px',
            borderRadius: '14px',
            width: 'min(92vw, 420px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowGoalModal(false)}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
              aria-label="Close"
            >✖️</button>
            <h2 style={{ marginTop: 0, color: 'var(--text)', marginBottom: 18 }}>Add New Goal</h2>
            <form onSubmit={createGoal}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-soft)', fontSize: 14 }}>Target Points</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newGoal.targetPoints}
                  onChange={e => setNewGoal({ ...newGoal, targetPoints: e.target.value })}
                  style={{ width: '100%', padding: 10, border: '2px solid var(--border)', borderRadius: 8, fontSize: 15 }}
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-soft)', fontSize: 14 }}>Goal Type</label>
                <select
                  value={newGoal.goalType}
                  onChange={e => {
                    const type = e.target.value;
                    setNewGoal({
                      ...newGoal,
                      goalType: type,
                      endDate: getEndDateForGoalType(type)
                    });
                  }}
                  style={{ width: '100%', padding: 10, border: '2px solid var(--border)', borderRadius: 8, fontSize: 15 }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-soft)', fontSize: 14 }}>End Date</label>
                <div style={{
                  width: '100%',
                  padding: 10,
                  border: '2px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 15,
                  background: 'var(--surface-alt)'
                }}>
                  {newGoal.endDate}
                </div>
              </div>
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '12px 0',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Add Goal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Page Content (keyed so each page fades in when you switch) */}
      <div key={loading ? 'loading' : currentPage} className={loading ? undefined : 'page-fade'}>
      {loading ? (
        <DashboardSkeleton />
      ) : loadError ? (
        <ErrorBanner message={loadError} onRetry={loadInitialData} />
      ) : currentPage === 'main' ? (
        <>
          {/* Score Tracker */}
          <div className="fade-up" style={{
            background: 'linear-gradient(135deg, #74b9ff, #0984e3)',
            padding: '20px',
            borderRadius: '15px',
            textAlign: 'center',
            marginBottom: '30px',
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'white',
            boxShadow: '0 6px 20px rgba(116, 185, 255, 0.3)'
          }}>
            🌍 Your Eco Score: 
            <span style={{ 
              color: totalScore >= 0 ? '#00ff88' : '#ff6b6b', 
              marginLeft: '15px',
              fontSize: '28px'
            }}>
              <AnimatedNumber value={totalScore} />
            </span>
          </div>

          {/* CO₂ saved and streaks */}
          <ImpactSummary refreshKey={dataVersion} />

          {/* Pinned Custom Activities */}
          {pinnedCustomActivities.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ color: '#f1c40f', marginBottom: '20px' }}>📌 Pinned Custom Activities</h2>
              <div className="activity-grid">
                {pinnedCustomActivities.map((p, idx) => (
                  <div key={`pinned-${idx}`} style={{ position: 'relative' }}>
                    <ActivityBox
                      activity={p.activityName}
                      points={p.points}
                      emoji={p.emoji || '✨'}
                      category={p.category}
                      co2Kg={p.co2Kg}
                      onClick={logPredefined}
                    />
                    <button
                      onClick={() => unpinCustomActivity(p.activityName)}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        background: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        cursor: 'pointer',
                        fontSize: 14,
                        lineHeight: '24px',
                        padding: 0
                      }}
                      title="Unpin"
                    >✖️</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Positive Activities */}
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#27ae60', marginBottom: '20px' }}>🌟 Positive Activities</h2>
            <div className="activity-grid">
              {positiveActivities.map((p, idx) => (
                <ActivityBox
                  key={`positive-${idx}`}
                  index={idx}
                  activity={p.activity}
                  points={p.points}
                  emoji={p.emoji}
                  category={p.category}
                  co2Kg={p.co2Kg}
                  onClick={logPredefined}
                />
              ))}
            </div>
          </div>

          {/* Negative Activities */}
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#c0392b', marginBottom: '20px' }}>⚠️ Negative Activities</h2>
            <div className="activity-grid">
              {negativeActivities.map((n, idx) => (
                <ActivityBox
                  key={`negative-${idx}`}
                  index={idx}
                  activity={n.activity}
                  points={n.points}
                  emoji={n.emoji}
                  category={n.category}
                  co2Kg={n.co2Kg}
                  onClick={logPredefined}
                />
              ))}
            </div>
          </div>

          {/* Custom Activity Form */}
          <div style={{
            backgroundColor: 'var(--surface-alt)',
            padding: '25px',
            borderRadius: '15px',
            marginBottom: '40px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>✨ Add Custom Activity</h2>
            <form onSubmit={handleCustomSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'end' }}>
              <div style={{ flex: '2', minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-soft)', fontSize: '14px' }}>
                  Activity Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Used solar energy"
                  value={customActivity}
                  onChange={(e) => setCustomActivity(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>
              <div style={{ flex: '1', minWidth: '100px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-soft)', fontSize: '14px' }}>
                  Points
                </label>
                <input
                  type="number"
                  placeholder="Points"
                  value={customPoints}
                  onChange={(e) => setCustomPoints(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>
              <div style={{ flex: '1', minWidth: '100px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-soft)', fontSize: '14px' }}>
                  CO₂ kg (optional)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="auto"
                  title="Estimated kg of CO₂ saved (positive) or emitted (negative). Leave blank to estimate from points."
                  value={customCo2}
                  onChange={(e) => setCustomCo2(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>
              <div style={{ flex: '1', minWidth: '100px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-soft)', fontSize: '14px' }}>
                  Category
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '1', minWidth: '100px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-soft)', fontSize: '14px' }}>
                  Emoji (optional)
                </label>
                <input
                  type="text"
                  placeholder="🌱"
                  value={customEmoji}
                  onChange={(e) => setCustomEmoji(e.target.value)}
                  maxLength="2"
                  style={{ width: '100%', padding: '12px', border: '2px solid var(--border)', borderRadius: '8px', fontSize: '14px', textAlign: 'center' }}
                />
              </div>
              <button 
                type="submit"
                style={{ 
                  padding: '12px 20px', 
                  backgroundColor: '#3498db', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Add Activity
              </button>
            </form>
          </div>

          {/* Goals Section */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: 'var(--text)', margin: 0 }}>🎯 Goals & Progress</h2>
              <button
                onClick={openGoalModal}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e67e22',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                + Add Goal
              </button>
            </div>
            {goals.filter(goal => !goal.isArchived).length === 0 ? (
  <div style={{
    textAlign: 'center',
    padding: '30px',
    color: 'var(--text-soft)',
    backgroundColor: 'var(--surface-alt)',
    borderRadius: '12px',
    border: '2px dashed var(--border)'
  }}>
    <div style={{ fontSize: '36px', marginBottom: '15px' }}>🎯</div>
    <p style={{ fontSize: '16px', marginBottom: '10px' }}>No active goals!</p>
    <p style={{ fontSize: '14px' }}>Set daily, weekly, or monthly eco-point targets to track your progress.</p>
  </div>
) : (
  <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
    {goals
      .filter(goal => !goal.isArchived) // Only show non-archived goals
      .map((goal, goalIndex) => {
        const progress = Math.min((goal.currentPoints / goal.targetPoints) * 100, 100);
        const isCompleted = goal.isCompleted;
        const isExpired = new Date() > new Date(goal.endDate) && !isCompleted;

        return (
          <div key={goal._id} className="fade-up hover-lift" style={{
            '--i': goalIndex,
            backgroundColor: 'var(--surface)',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            border: `2px solid ${isCompleted ? '#27ae60' : isExpired ? '#e74c3c' : '#f39c12'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', color: 'var(--text)' }}>{goal.goalType} Goal</h3>
                <p style={{ margin: '0', color: 'var(--text-muted)' }}>
                  Due: {new Date(goal.endDate).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => deleteGoal(goal._id)}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                🗑️
              </button>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-soft)' }}>
                  Progress: <AnimatedNumber value={goal.currentPoints} /> / {goal.targetPoints} points
                </span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: isCompleted ? '#27ae60' : '#f39c12' }}>
                  <AnimatedNumber value={Math.round(progress)} suffix="%" />
                </span>
              </div>
              <ProgressBar
                percent={progress}
                color={isCompleted ? '#27ae60' : '#f39c12'}
                label={`${goal.goalType} goal progress`}
              />
            </div>
            <div style={{
              padding: '8px 12px',
              backgroundColor: isCompleted ? 'var(--pos-soft-bg)' : isExpired ? 'var(--neg-soft-bg)' : 'var(--warn-bg)',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: isCompleted ? '#27ae60' : isExpired ? '#e74c3c' : '#f39c12'
              }}>
                {isCompleted ? '🎉 Goal Completed!' : isExpired ? '⏰ Goal Expired' : '🚀 In Progress'}
              </span>
            </div>
          </div>
        );
      })}
  </div>
)}
          </div>

          {/* Badge Display */}
          <BadgeDisplay showStats={true} refreshKey={dataVersion} />

          {/* Visualization */}
          <ProgressCharts refreshKey={dataVersion} />
        </>
      ) : currentPage === 'history' ? (
        <GoalHistory onBack={() => setCurrentPage('main')} />
      ) : currentPage === 'leaderboard' ? (
        <Leaderboard onBack={() => setCurrentPage('main')} />
      ) : (
        <ActivityLog
          activities={activities}
          handleDelete={handleDelete}
          handleEdit={handleEdit}
          handleExport={handleExport}
          exporting={exporting}
          pinnedCustomActivities={pinnedCustomActivities}
          pinCustomActivity={pinCustomActivity}
          unpinCustomActivity={unpinCustomActivity}
          positiveActivities={positiveActivities}
          negativeActivities={negativeActivities}
          categories={categories}
          selectedCategoryFilter={selectedCategoryFilter}
          setSelectedCategoryFilter={setSelectedCategoryFilter}
        />
      )}
      </div>

      {/* Badge Notification */}
      {showBadgeNotification && (
        <BadgeNotification 
          badges={newBadges} 
          onClose={() => {
            setShowBadgeNotification(false);
            setNewBadges([]);
          }} 
        />
      )}

      {/* Goal Completion Notification */}
      {showGoalCompleteNotification && completedGoal && (
        <>
        <Confetti pieces={60} />
        <div style={{
          position: 'fixed',
          top: '30%',
          left: '50%',
          width: 'min(90vw, 440px)',
          transform: 'translate(-50%, -50%)',
          background: '#27ae60',
          color: 'white',
          padding: '32px 40px',
          borderRadius: '18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          zIndex: 3000,
          textAlign: 'center',
          fontSize: '22px',
          fontWeight: 'bold',
          animation: 'fadeInScale 0.5s'
        }}>
          🎉 Congratulations!<br />
          You completed your <span style={{ textTransform: 'capitalize' }}>{completedGoal.goalType}</span> goal of <b>{completedGoal.targetPoints} points</b>!
        </div>
        </>
      )}
    </div>
  );
}

export default App;