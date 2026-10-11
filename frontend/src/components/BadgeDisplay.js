import React, { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api';
import { ErrorBanner } from './ui';
import AnimatedNumber from './AnimatedNumber';

function BadgeDisplay(props) {
  // refreshKey changes whenever the user logs, edits or deletes something
  const { showStats = true, refreshKey = 0 } = props;
  const [badges, setBadges] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllBadges, setShowAllBadges] = useState(false);

  // Rarity colors
  const rarityColors = {
    common: '#95a5a6',
    rare: '#3498db',
    epic: '#9b59b6',
    legendary: '#f39c12'
  };

  const rarityGlow = {
    common: '0 0 10px rgba(149, 165, 166, 0.5)',
    rare: '0 0 15px rgba(52, 152, 219, 0.6)',
    epic: '0 0 20px rgba(155, 89, 182, 0.7)',
    legendary: '0 0 25px rgba(243, 156, 18, 0.8)'
  };

  const fetchBadgesAndStats = useCallback(async () => {
    try {
      const [badgesResponse, statsResponse] = await Promise.all([
        api.get('/api/badges'),
        api.get('/api/stats')
      ]);

      setBadges(badgesResponse.data);
      setUserStats(statsResponse.data);
      setError('');
    } catch (err) {
      console.error('Error fetching badges and stats:', err);
      setError(getErrorMessage(err, 'Could not load your badges.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadgesAndStats();
  }, [fetchBadgesAndStats, refreshKey]);

  if (error && badges.length === 0 && !userStats) {
    return <ErrorBanner message={error} onRetry={fetchBadgesAndStats} />;
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px',
        color: 'var(--text-soft)'
      }}>
        <div style={{ fontSize: '24px' }}>🏆</div>
        <span style={{ marginLeft: '10px' }}>Loading badges...</span>
      </div>
    );
  }

  const displayedBadges = showAllBadges ? badges : badges.slice(0, 6);
  const badgesByRarity = badges.reduce((acc, badge) => {
    acc[badge.badgeRarity] = (acc[badge.badgeRarity] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{
      backgroundColor: 'var(--surface-alt)',
      borderRadius: '15px',
      padding: '25px',
      marginBottom: '30px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{
          color: 'var(--text)',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          fontSize: '24px'
        }}>
          🏆 Your Badges ({badges.length})
        </h2>
        
        {badges.length > 6 && (
          <button
            onClick={() => setShowAllBadges(!showAllBadges)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'background-color 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2980b9'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#3498db'}
          >
            {showAllBadges ? 'Show Less' : 'Show All'}
          </button>
        )}
      </div>

      {/* Stats Overview */}
      {showStats && userStats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px',
          marginBottom: '25px',
          padding: '15px',
          backgroundColor: 'var(--surface)',
          borderRadius: '10px',
          border: '2px solid var(--border)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', color: '#e67e22', marginBottom: '5px' }}>🔥</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
              <AnimatedNumber value={userStats.currentStreak} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Current Streak</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', color: '#27ae60', marginBottom: '5px' }}>🌟</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
              <AnimatedNumber value={userStats.consecutivePositiveActivities} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Positive Streak</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', color: '#3498db', marginBottom: '5px' }}>💯</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
              <AnimatedNumber value={userStats.totalPoints} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Points</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', color: '#9b59b6', marginBottom: '5px' }}>🎯</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
              <AnimatedNumber value={userStats.goalsCompleted} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Goals Done</div>
          </div>
        </div>
      )}

      {/* Badge Rarity Summary */}
      {badges.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          {Object.entries(badgesByRarity).map(([rarity, count]) => (
            <div key={rarity} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'var(--surface)',
              borderRadius: '8px',
              border: `2px solid ${rarityColors[rarity]}`,
              boxShadow: rarityGlow[rarity]
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: rarityColors[rarity]
              }}></div>
              <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize' }}>
                {rarity}: {count}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Badges Grid */}
      {badges.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: 'var(--text-soft)',
          backgroundColor: 'var(--surface)',
          borderRadius: '12px',
          border: '2px dashed var(--border)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🏆</div>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>No badges earned yet!</p>
          <p style={{ fontSize: '14px' }}>Start logging eco-activities to earn your first badges.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          {displayedBadges.map((badge, index) => (
            <div
              key={badge._id}
              className="fade-up"
              style={{
                '--i': index,
                backgroundColor: 'var(--surface)',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center',
                border: `3px solid ${rarityColors[badge.badgeRarity]}`,
                boxShadow: rarityGlow[badge.badgeRarity],
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = `${rarityGlow[badge.badgeRarity]}, 0 8px 16px rgba(0,0,0,0.2)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = rarityGlow[badge.badgeRarity];
              }}
            >
              {/* Rarity indicator */}
              <div style={{
                position: 'absolute',
                top: '0',
                right: '0',
                padding: '4px 8px',
                backgroundColor: rarityColors[badge.badgeRarity],
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                borderBottomLeftRadius: '8px'
              }}>
                {badge.badgeRarity}
              </div>

              {/* Badge Icon */}
              <div style={{
                fontSize: '48px',
                marginBottom: '10px',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
              }}>
                {badge.badgeIcon}
              </div>

              {/* Badge Name */}
              <h3 style={{
                margin: '0 0 8px 0',
                color: 'var(--text)',
                fontSize: '16px',
                fontWeight: 'bold'
              }}>
                {badge.badgeName}
              </h3>

              {/* Badge Description */}
              <p style={{
                margin: '0 0 12px 0',
                color: 'var(--text-muted)',
                fontSize: '12px',
                lineHeight: '1.4'
              }}>
                {badge.badgeDescription}
              </p>

              {/* Related Value */}
              {badge.relatedValue && (
                <div style={{
                  backgroundColor: rarityColors[badge.badgeRarity],
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  display: 'inline-block',
                  marginBottom: '8px'
                }}>
                  {badge.relatedValue}
                </div>
              )}

              {/* Earned Date */}
              <div style={{
                fontSize: '10px',
                color: '#95a5a6',
                marginTop: '8px'
              }}>
                Earned: {new Date(badge.earnedDate).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show more indicator */}
      {!showAllBadges && badges.length > 6 && (
        <div style={{
          textAlign: 'center',
          marginTop: '15px',
          color: 'var(--text-muted)',
          fontSize: '14px'
        }}>
          ... and {badges.length - 6} more badges
        </div>
      )}
    </div>
  );
};

export default BadgeDisplay;