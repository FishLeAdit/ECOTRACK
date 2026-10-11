import React, { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api';
import { useTheme } from '../ThemeContext';
import { ErrorBanner, Spinner } from './ui';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler // needed for the line chart's shaded area (fill: true)
);

function ProgressCharts({ refreshKey = 0 }) {
  const { theme } = useTheme();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('week'); // 'day', 'week', 'month'

  const fetchActivities = useCallback(async () => {
    try {
      const response = await api.get('/api/activities');
      setActivities(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(getErrorMessage(err, 'Could not load your chart data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Charts group the same activities in different ways, so only new data needs a fetch
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities, refreshKey]);

  if (loading) {
    return <Spinner label="Loading charts…" />;
  }

  if (error && activities.length === 0) {
    return <ErrorBanner message={error} onRetry={fetchActivities} />;
  }

  // Chart.js draws on a canvas, so it can't read CSS variables: pick colors per theme
  const textColor = theme === 'dark' ? '#b6c2cf' : '#555555';
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  const axisOptions = (title) => ({
    ticks: { color: textColor },
    grid: { color: gridColor },
    ...(title ? { title: { display: true, text: title, color: textColor } } : {})
  });

  // Process data for charts
  const processTimeData = () => {
    const now = new Date();
    let labels = [];
    let dataPoints = [];

    if (timeRange === 'day') {
      // Last 7 days
      labels = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      });

      dataPoints = Array(7).fill(0);
      activities.forEach(activity => {
        const activityDate = new Date(activity.date);
        const diffDays = Math.floor((now - activityDate) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          dataPoints[6 - diffDays] += activity.points;
        }
      });
    } else if (timeRange === 'week') {
      // Last 4 weeks
      labels = Array.from({ length: 4 }, (_, i) => `Week ${4 - i}`);
      
      dataPoints = Array(4).fill(0);
      activities.forEach(activity => {
        const activityDate = new Date(activity.date);
        const diffWeeks = Math.floor((now - activityDate) / (1000 * 60 * 60 * 24 * 7));
        if (diffWeeks >= 0 && diffWeeks < 4) {
          dataPoints[3 - diffWeeks] += activity.points;
        }
      });
    } else {
      // Last 6 months
      labels = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now);
        date.setMonth(date.getMonth() - (5 - i));
        return date.toLocaleDateString('en-US', { month: 'short' });
      });
      
      dataPoints = Array(6).fill(0);
      activities.forEach(activity => {
        const activityDate = new Date(activity.date);
        const diffMonths = (now.getFullYear() - activityDate.getFullYear()) * 12 + 
                          now.getMonth() - activityDate.getMonth();
        if (diffMonths >= 0 && diffMonths < 6) {
          dataPoints[5 - diffMonths] += activity.points;
        }
      });
    }

    return { labels, dataPoints };
  };

  const processCategoryData = () => {
    const categories = [
      'Transportation', 'Energy', 'Waste', 'Food', 
      'Water', 'Shopping', 'Home', 'Work', 'Recreation', 'General'
    ];
    
    const dataPoints = Array(categories.length).fill(0);
    
    activities.forEach(activity => {
      const categoryIndex = categories.indexOf(activity.category || 'General');
      if (categoryIndex !== -1) {
        dataPoints[categoryIndex] += activity.points;
      }
    });
    
    return { labels: categories, dataPoints };
  };

  const { labels: timeLabels, dataPoints: timeData } = processTimeData();
  const { labels: categoryLabels, dataPoints: categoryData } = processCategoryData();

  return (
    <div style={{ 
      marginTop: '40px',
      backgroundColor: 'var(--surface-alt)',
      borderRadius: '15px',
      padding: '25px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ color: 'var(--text)', marginBottom: '25px' }}>📊 Progress Visualization</h2>
      
      {/* Time Range Selector */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setTimeRange('day')}
          style={{
            padding: '8px 16px',
            backgroundColor: timeRange === 'day' ? '#3498db' : 'var(--track)',
            color: timeRange === 'day' ? 'white' : 'var(--text)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Daily
        </button>
        <button
          onClick={() => setTimeRange('week')}
          style={{
            padding: '8px 16px',
            backgroundColor: timeRange === 'week' ? '#3498db' : 'var(--track)',
            color: timeRange === 'week' ? 'white' : 'var(--text)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Weekly
        </button>
        <button
          onClick={() => setTimeRange('month')}
          style={{
            padding: '8px 16px',
            backgroundColor: timeRange === 'month' ? '#3498db' : 'var(--track)',
            color: timeRange === 'month' ? 'white' : 'var(--text)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Monthly
        </button>
      </div>
      
      {/* Points Over Time Chart */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>
          {timeRange === 'day' ? 'Daily' : timeRange === 'week' ? 'Weekly' : 'Monthly'} Points
        </h3>
        <div style={{ height: '300px' }}>
          <Line
            data={{
              labels: timeLabels,
              datasets: [
                {
                  label: 'Eco Points',
                  data: timeData,
                  borderColor: '#27ae60',
                  backgroundColor: 'rgba(39, 174, 96, 0.2)',
                  tension: 0.3,
                  fill: true
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top',
                  labels: { color: textColor }
                },
                tooltip: {
                  callbacks: {
                    label: (context) => `${context.dataset.label}: ${context.raw} points`
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ...axisOptions('Points')
                },
                x: axisOptions(timeRange === 'day' ? 'Day' : timeRange === 'week' ? 'Week' : 'Month')
              }
            }}
          />
        </div>
      </div>
      
      {/* Category Distribution Chart */}
      <div>
        <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Points by Category</h3>
        <div style={{ height: '300px' }}>
          <Bar
            data={{
              labels: categoryLabels,
              datasets: [
                {
                  label: 'Points',
                  data: categoryData,
                  backgroundColor: [
                    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', 
                    '#9b59b6', '#1abc9c', '#d35400', '#34495e', 
                    '#16a085', '#7f8c8d'
                  ],
                  borderColor: [
                    '#2980b9', '#c0392b', '#27ae60', '#e67e22',
                    '#8e44ad', '#16a085', '#e67e22', '#2c3e50',
                    '#1abc9c', '#95a5a6'
                  ],
                  borderWidth: 1
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  callbacks: {
                    label: (context) => `${context.label}: ${context.raw} points`
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ...axisOptions('Points')
                },
                x: axisOptions()
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default ProgressCharts;