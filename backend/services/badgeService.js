const Badge = require('../models/badge');
const UserStats = require('../models/userStats');
const Activity = require('../models/activity');
const User = require('../models/user');
const { CATEGORIES } = require('../config');

const DAY_MS = 24 * 60 * 60 * 1000;

// Calendar day ("YYYY-MM-DD") of a date in the user's timezone.
// tzOffset is Date#getTimezoneOffset() (minutes behind UTC, so UTC-5 => 300).
function dayKey(date, tzOffset = 0) {
  return new Date(new Date(date).getTime() - tzOffset * 60000).toISOString().slice(0, 10);
}

function dayNumber(key) {
  return Math.floor(Date.parse(`${key}T00:00:00Z`) / DAY_MS);
}

// Define all available badges
const BADGE_DEFINITIONS = {
  // Streak Badges
  'first_day': {
    badgeId: 'first_day',
    badgeName: 'First Step',
    badgeDescription: 'Logged your first eco-activity!',
    badgeIcon: '🌱',
    badgeCategory: 'milestone',
    badgeRarity: 'common',
    trigger: (stats) => stats.totalActivities >= 1
  },
  
  'streak_3': {
    badgeId: 'streak_3',
    badgeName: 'Getting Started',
    badgeDescription: 'Maintained a 3-day activity streak!',
    badgeIcon: '🔥',
    badgeCategory: 'streak',
    badgeRarity: 'common',
    trigger: (stats) => stats.currentStreak >= 3
  },
  
  'streak_7': {
    badgeId: 'streak_7',
    badgeName: 'Week Warrior',
    badgeDescription: 'Amazing! 7-day activity streak achieved!',
    badgeIcon: '⚡',
    badgeCategory: 'streak',
    badgeRarity: 'rare',
    trigger: (stats) => stats.currentStreak >= 7
  },
  
  'streak_30': {
    badgeId: 'streak_30',
    badgeName: 'Eco Champion',
    badgeDescription: 'Incredible 30-day streak! You\'re an eco warrior!',
    badgeIcon: '👑',
    badgeCategory: 'streak',
    badgeRarity: 'epic',
    trigger: (stats) => stats.currentStreak >= 30
  },
  
  'streak_100': {
    badgeId: 'streak_100',
    badgeName: 'Legendary Guardian',
    badgeDescription: '100-day streak! You\'re protecting our planet every day!',
    badgeIcon: '🌍',
    badgeCategory: 'streak',
    badgeRarity: 'legendary',
    trigger: (stats) => stats.currentStreak >= 100
  },
  
  // Positive Activity Streaks
  'positive_5': {
    badgeId: 'positive_5',
    badgeName: 'Positive Vibes',
    badgeDescription: '5 positive activities in a row!',
    badgeIcon: '🌟',
    badgeCategory: 'achievement',
    badgeRarity: 'common',
    trigger: (stats) => stats.consecutivePositiveActivities >= 5
  },
  
  'positive_10': {
    badgeId: 'positive_10',
    badgeName: 'Green Machine',
    badgeDescription: '10 consecutive positive eco-actions!',
    badgeIcon: '💚',
    badgeCategory: 'achievement',
    badgeRarity: 'rare',
    trigger: (stats) => stats.consecutivePositiveActivities >= 10
  },
  
  'positive_25': {
    badgeId: 'positive_25',
    badgeName: 'Positivity Master',
    badgeDescription: '25 positive activities without a single negative one!',
    badgeIcon: '✨',
    badgeCategory: 'achievement',
    badgeRarity: 'epic',
    trigger: (stats) => stats.consecutivePositiveActivities >= 25
  },
  
  // Points Milestones
  'points_100': {
    badgeId: 'points_100',
    badgeName: 'Century Club',
    badgeDescription: 'Earned your first 100 eco-points!',
    badgeIcon: '💯',
    badgeCategory: 'milestone',
    badgeRarity: 'common',
    trigger: (stats) => stats.totalPoints >= 100
  },
  
  'points_500': {
    badgeId: 'points_500',
    badgeName: 'Points Collector',
    badgeDescription: '500 eco-points accumulated!',
    badgeIcon: '🏆',
    badgeCategory: 'milestone',
    badgeRarity: 'rare',
    trigger: (stats) => stats.totalPoints >= 500
  },
  
  'points_1000': {
    badgeId: 'points_1000',
    badgeName: 'Eco Millionaire',
    badgeDescription: '1000 eco-points! You\'re making a real difference!',
    badgeIcon: '💎',
    badgeCategory: 'milestone',
    badgeRarity: 'epic',
    trigger: (stats) => stats.totalPoints >= 1000
  },
  
  // Goal-related badges
  'first_goal': {
    badgeId: 'first_goal',
    badgeName: 'Goal Setter',
    badgeDescription: 'Created your first eco-goal!',
    badgeIcon: '🎯',
    badgeCategory: 'milestone',
    badgeRarity: 'common',
    trigger: (stats) => stats.goalsCreated >= 1
  },
  
  'goals_5': {
    badgeId: 'goals_5',
    badgeName: 'Achievement Hunter',
    badgeDescription: 'Completed 5 eco-goals!',
    badgeIcon: '🏅',
    badgeCategory: 'achievement',
    badgeRarity: 'rare',
    trigger: (stats) => stats.goalsCompleted >= 5
  },
  
  // Category specialists
  'transport_master': {
    badgeId: 'transport_master',
    badgeName: 'Transport Master',
    badgeDescription: 'Logged 25+ transportation activities!',
    badgeIcon: '🚲',
    badgeCategory: 'special',
    badgeRarity: 'rare',
    trigger: (stats) => stats.categoryStats.Transportation >= 25
  },
  
  'energy_saver': {
    badgeId: 'energy_saver',
    badgeName: 'Energy Saver',
    badgeDescription: 'Expert in energy conservation!',
    badgeIcon: '⚡',
    badgeCategory: 'special',
    badgeRarity: 'rare',
    trigger: (stats) => stats.categoryStats.Energy >= 25
  },
  
  'waste_warrior': {
    badgeId: 'waste_warrior',
    badgeName: 'Waste Warrior',
    badgeDescription: 'Fighting waste like a champion!',
    badgeIcon: '♻️',
    badgeCategory: 'special',
    badgeRarity: 'rare',
    trigger: (stats) => stats.categoryStats.Waste >= 25
  },
  
  // Special achievements
  'comeback_kid': {
    badgeId: 'comeback_kid',
    badgeName: 'Comeback Kid',
    badgeDescription: 'Bounced back with positive activities after negatives!',
    badgeIcon: '🌈',
    badgeCategory: 'special',
    badgeRarity: 'rare',
    trigger: (stats) => stats.consecutivePositiveActivities >= 5 && stats.totalNegativeActivities > 0
  },
  
  'balanced_life': {
    badgeId: 'balanced_life',
    badgeName: 'Balanced Life',
    badgeDescription: 'Active in 5+ different eco-categories!',
    badgeIcon: '⚖️',
    badgeCategory: 'special',
    badgeRarity: 'epic',
    trigger: (stats) => {
      const activeCategories = Object.values(stats.categoryStats).filter(count => count > 0).length;
      return activeCategories >= 5;
    }
  }
};

class BadgeService {
  // Update user stats when activity is added
  static async updateUserStats(userId, activity) {
    try {
      let userStats = await UserStats.findOne({ userId });
      
      if (!userStats) {
        userStats = new UserStats({ userId });
      }
      
      const today = new Date();
      const activityDate = new Date(activity.date);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Update basic counters
      userStats.totalActivities += 1;
      userStats.totalPoints += activity.points;
      
      if (activity.points > 0) {
        userStats.totalPositiveActivities += 1;
        userStats.consecutivePositiveActivities += 1;
        userStats.maxConsecutivePositiveActivities = Math.max(
          userStats.maxConsecutivePositiveActivities,
          userStats.consecutivePositiveActivities
        );
      } else {
        userStats.totalNegativeActivities += 1;
        userStats.consecutivePositiveActivities = 0; // Reset positive streak
      }
      
      // Update category stats
      const category = activity.category || 'General';
      if (userStats.categoryStats[category] !== undefined) {
        userStats.categoryStats[category] += 1;
      }
      
      // Update streak logic
      const lastActivityDate = userStats.lastActivityDate ? new Date(userStats.lastActivityDate) : null;
      const isToday = activityDate.toDateString() === today.toDateString();
      const isYesterday = lastActivityDate && lastActivityDate.toDateString() === yesterday.toDateString();
      const isSameDay = lastActivityDate && lastActivityDate.toDateString() === activityDate.toDateString();
      
      if (!lastActivityDate || isSameDay) {
        // First activity or same day activity - maintain current streak
        if (!lastActivityDate) {
          userStats.currentStreak = 1;
        }
      } else if (isYesterday || (isToday && lastActivityDate.toDateString() === yesterday.toDateString())) {
        // Continuing streak
        userStats.currentStreak += 1;
      } else {
        // Streak broken, start new
        userStats.currentStreak = 1;
      }
      
      userStats.longestStreak = Math.max(userStats.longestStreak, userStats.currentStreak);
      userStats.lastActivityDate = activityDate;
      userStats.lastUpdated = new Date();
      
      await userStats.save();
      
      // Check for new badges
      const newBadges = await this.checkAndAwardBadges(userId, userStats);
      
      return { userStats, newBadges };
      
    } catch (error) {
      console.error('❌ Error updating user stats:', error);
      throw error;
    }
  }
  
  // Check and award eligible badges
  static async checkAndAwardBadges(userId, userStats) {
    const newBadges = [];
    
    for (const [badgeId, badgeDefinition] of Object.entries(BADGE_DEFINITIONS)) {
      try {
        // Check if user already has this badge
        const existingBadge = await Badge.findOne({ userId, badgeId });
        
        if (!existingBadge && badgeDefinition.trigger(userStats)) {
          // User is eligible for this badge and doesn't have it yet
          const newBadge = new Badge({
            userId,
            badgeId: badgeDefinition.badgeId,
            badgeName: badgeDefinition.badgeName,
            badgeDescription: badgeDefinition.badgeDescription,
            badgeIcon: badgeDefinition.badgeIcon,
            badgeCategory: badgeDefinition.badgeCategory,
            badgeRarity: badgeDefinition.badgeRarity,
            relatedValue: this.getRelatedValue(badgeDefinition, userStats)
          });
          
          await newBadge.save();
          newBadges.push(newBadge);
          
          console.log(`🏆 New badge awarded to ${userId}: ${badgeDefinition.badgeName}`);
        }
      } catch (error) {
        // Ignore duplicate key errors (user already has badge)
        if (error.code !== 11000) {
          console.error(`❌ Error checking badge ${badgeId}:`, error);
        }
      }
    }
    
    return newBadges;
  }
  
  // Update stats when goal is completed
  static async updateStatsOnGoalCompletion(userId) {
    try {
      let userStats = await UserStats.findOne({ userId });
      if (!userStats) {
        userStats = new UserStats({ userId });
      }
      
      userStats.goalsCompleted += 1;
      userStats.lastUpdated = new Date();
      
      await userStats.save();
      
      // Check for new badges
      const newBadges = await this.checkAndAwardBadges(userId, userStats);
      
      return { userStats, newBadges };
    } catch (error) {
      console.error('❌ Error updating stats on goal completion:', error);
      throw error;
    }
  }
  
  // Update stats when goal is created
  static async updateStatsOnGoalCreation(userId) {
    try {
      let userStats = await UserStats.findOne({ userId });
      if (!userStats) {
        userStats = new UserStats({ userId });
      }
      
      userStats.goalsCreated += 1;
      userStats.lastUpdated = new Date();
      
      await userStats.save();
      
      // Check for new badges
      const newBadges = await this.checkAndAwardBadges(userId, userStats);
      
      return { userStats, newBadges };
    } catch (error) {
      console.error('❌ Error updating stats on goal creation:', error);
      throw error;
    }
  }
  
  // Get related value for badge (used for display purposes)
  static getRelatedValue(badgeDefinition, userStats) {
    if (badgeDefinition.badgeCategory === 'streak') {
      return userStats.currentStreak;
    } else if (badgeDefinition.badgeId.startsWith('positive_')) {
      return userStats.consecutivePositiveActivities;
    } else if (badgeDefinition.badgeId.startsWith('points_')) {
      return userStats.totalPoints;
    } else if (badgeDefinition.badgeId.startsWith('goals_')) {
      return userStats.goalsCompleted;
    }
    return null;
  }
  
  // Get user's badges
  static async getUserBadges(userId) {
    try {
      const badges = await Badge.find({ userId, isVisible: true })
        .sort({ earnedDate: -1 });
      return badges;
    } catch (error) {
      console.error('❌ Error fetching user badges:', error);
      throw error;
    }
  }
  
  // Get user stats
  static async getUserStats(userId) {
    try {
      let userStats = await UserStats.findOne({ userId });
      if (!userStats) {
        userStats = new UserStats({ userId });
        await userStats.save();
      }
      return userStats;
    } catch (error) {
      console.error('❌ Error fetching user stats:', error);
      throw error;
    }
  }
  
  // Derives every activity-based stat from the raw activity list.
  // Pure function: no database access, so it can also be used for read-only views.
  static computeDerivedStats(activities, tzOffset = 0) {
    const sorted = [...activities].sort((a, b) => new Date(a.date) - new Date(b.date));

    const categoryStats = {};
    CATEGORIES.forEach(c => { categoryStats[c] = 0; });

    let totalPoints = 0;
    let totalPositive = 0;
    let totalNegative = 0;
    let positiveRun = 0;
    let maxPositiveRun = 0;
    const days = new Set();

    for (const a of sorted) {
      totalPoints += a.points;
      if (a.points > 0) {
        totalPositive += 1;
        positiveRun += 1;
        maxPositiveRun = Math.max(maxPositiveRun, positiveRun);
      } else {
        totalNegative += 1;
        positiveRun = 0;
      }
      categoryStats[a.category in categoryStats ? a.category : 'General'] += 1;
      days.add(dayKey(a.date, tzOffset));
    }

    // Streak = consecutive calendar days with at least one activity
    const dayNumbers = [...days].map(dayNumber).sort((a, b) => a - b);
    let longestStreak = 0;
    let runLength = 0;
    let previous = null;
    for (const n of dayNumbers) {
      runLength = previous !== null && n === previous + 1 ? runLength + 1 : 1;
      longestStreak = Math.max(longestStreak, runLength);
      previous = n;
    }
    // The current streak is only alive if the last active day is today or yesterday
    const today = dayNumber(dayKey(new Date(), tzOffset));
    const lastDay = dayNumbers.length ? dayNumbers[dayNumbers.length - 1] : null;
    const currentStreak = lastDay !== null && lastDay >= today - 1 ? runLength : 0;

    return {
      totalActivities: sorted.length,
      totalPoints,
      totalPositiveActivities: totalPositive,
      totalNegativeActivities: totalNegative,
      consecutivePositiveActivities: positiveRun,
      maxConsecutivePositiveActivities: maxPositiveRun,
      currentStreak,
      longestStreak,
      lastActivityDate: sorted.length ? sorted[sorted.length - 1].date : undefined,
      categoryStats
    };
  }

  // Rebuilds a user's stats from their activities and awards any newly earned badges.
  // Call after every activity add / edit / delete. Goal counters are left untouched.
  static async recalculateStats(userId, tzOffset = 0) {
    const activities = await Activity.find({ userId }).select('points category date').lean();
    const derived = this.computeDerivedStats(activities, tzOffset);

    const set = { lastUpdated: new Date() };
    for (const [key, value] of Object.entries(derived)) {
      if (key === 'categoryStats') {
        for (const [category, count] of Object.entries(value)) {
          set[`categoryStats.${category}`] = count;
        }
      } else if (value !== undefined) {
        set[key] = value;
      }
    }
    const update = { $set: set };
    if (derived.lastActivityDate === undefined) update.$unset = { lastActivityDate: 1 };

    const userStats = await UserStats.findOneAndUpdate({ userId }, update, { upsert: true, new: true });
    const newBadges = await this.checkAndAwardBadges(userId, userStats);
    return { userStats, newBadges };
  }

  // Stored stats with the streak figures re-evaluated for "now" and the user's timezone,
  // so a streak that lapsed since the last activity isn't shown as still alive.
  static async getLiveStats(userId, tzOffset = 0) {
    const stored = await this.getUserStats(userId);
    const activities = await Activity.find({ userId }).select('points category date').lean();
    const derived = this.computeDerivedStats(activities, tzOffset);
    return {
      ...stored.toObject(),
      currentStreak: derived.currentStreak,
      longestStreak: derived.longestStreak
    };
  }

  // Replaces user ids with usernames on leaderboard rows
  static async attachUsernames(rows) {
    const ids = rows.map(r => r.userId).filter(id => /^[a-f\d]{24}$/i.test(id));
    const users = await User.find({ _id: { $in: ids } }).select('username').lean();
    const names = new Map(users.map(u => [String(u._id), u.username]));
    return rows
      .map(r => ({ ...r, username: names.get(r.userId) }))
      .filter(r => r.username); // drop rows for users that no longer exist
  }

  // Leaderboard by badges (rarest first). excludeUserId keeps the shared demo account out.
  static async getBadgeLeaderboard(excludeUserId) {
    const match = { isVisible: true };
    if (excludeUserId) match.userId = { $ne: String(excludeUserId) };

    const rows = await Badge.aggregate([
      { $match: match },
      { $group: {
        _id: '$userId',
        badgeCount: { $sum: 1 },
        rareCount: { $sum: { $cond: [{ $eq: ['$badgeRarity', 'rare'] }, 1, 0] } },
        epicCount: { $sum: { $cond: [{ $eq: ['$badgeRarity', 'epic'] }, 1, 0] } },
        legendaryCount: { $sum: { $cond: [{ $eq: ['$badgeRarity', 'legendary'] }, 1, 0] } }
      }},
      { $sort: { legendaryCount: -1, epicCount: -1, rareCount: -1, badgeCount: -1 } },
      { $limit: 20 }
    ]);

    const named = await this.attachUsernames(rows.map(({ _id, ...rest }) => ({ userId: _id, ...rest })));
    return named.slice(0, 10).map((row, i) => ({ rank: i + 1, ...row }));
  }

  // Leaderboard by total eco points
  static async getPointsLeaderboard(excludeUserId) {
    const query = { totalActivities: { $gt: 0 } };
    if (excludeUserId) query.userId = { $ne: String(excludeUserId) };

    const rows = await UserStats.find(query)
      .sort({ totalPoints: -1, longestStreak: -1 })
      .limit(20)
      .select('userId totalPoints currentStreak longestStreak totalActivities')
      .lean();

    const named = await this.attachUsernames(rows.map(r => ({
      userId: r.userId,
      totalPoints: r.totalPoints,
      currentStreak: r.currentStreak,
      longestStreak: r.longestStreak,
      totalActivities: r.totalActivities
    })));
    return named.slice(0, 10).map((row, i) => ({ rank: i + 1, ...row }));
  }
}

BadgeService.dayKey = dayKey;
BadgeService.dayNumber = dayNumber;

module.exports = BadgeService;