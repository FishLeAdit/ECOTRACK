const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Activity = require('../models/activity');
const Goal = require('../models/goal');
const Badge = require('../models/badge');
const UserStats = require('../models/userStats');
const BadgeService = require('./badgeService');
const { DEMO_USERNAME } = require('../config');

const HOUR_MS = 60 * 60 * 1000;
const MAX_DEMO_ACTIVITIES = 300;

let demoUserId = null;

function resetIntervalMs() {
  const hours = parseFloat(process.env.DEMO_RESET_HOURS);
  return (Number.isFinite(hours) && hours > 0 ? hours : 6) * HOUR_MS;
}

// Finds or creates the shared demo user. Its password is random and never revealed,
// so it can only be entered through POST /api/auth/demo.
async function ensureDemoUser() {
  let user = await User.findOne({ isDemo: true });
  if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    user = await User.create({
      username: DEMO_USERNAME,
      usernameLower: DEMO_USERNAME,
      passwordHash,
      isDemo: true
    });
    console.log('👤 Created demo user');
  }
  demoUserId = String(user._id);
  return user;
}

async function getDemoUserId() {
  if (demoUserId) return demoUserId;
  const user = await User.findOne({ isDemo: true }).select('_id').lean();
  demoUserId = user ? String(user._id) : null;
  return demoUserId;
}

// [days ago, hours ago, name, points, category, co2Kg]
const SAMPLE_ACTIVITIES = [
  [6, 5, 'Used Bicycle', 5, 'Transportation', 1.0],
  [6, 3, 'Recycled Waste', 3, 'Waste', 0.5],
  [5, 6, 'Walked instead of driving', 4, 'Transportation', 0.4],
  [5, 4, 'Used Reusable Bottle', 2, 'Water', 0.08],
  [5, 2, 'Wasted Food', -3, 'Food', -1.2],
  [4, 5, 'Used Public Transport', 3, 'Transportation', 1.5],
  [4, 3, 'Composted Kitchen Waste', 3, 'Waste', 0.3],
  [3, 6, 'Drove Car Alone', -5, 'Transportation', -2.0],
  [3, 4, 'Bought Local Produce', 2, 'Food', 0.5],
  [2, 5, 'Used Bicycle', 5, 'Transportation', 1.0],
  [2, 3, 'Reduced Electricity Usage', 4, 'Energy', 0.4],
  [1, 6, 'Walked instead of driving', 4, 'Transportation', 0.4],
  [1, 4, 'Planted a Tree', 10, 'General', 20],
  [0, 3, 'Used Public Transport', 3, 'Transportation', 1.5],
  [0, 1, 'Used Reusable Bottle', 2, 'Water', 0.08]
];

// Gives the demo a week of believable history so charts, streaks and badges have something to show
async function seedDemoData(userId) {
  const now = Date.now();
  await Activity.insertMany(SAMPLE_ACTIVITIES.map(([daysAgo, hoursAgo, activityName, points, category, co2Kg]) => ({
    userId,
    activityName,
    points,
    category,
    co2Kg,
    type: points > 0 ? 'Positive' : 'Negative',
    date: new Date(now - daysAgo * 24 * HOUR_MS - hoursAgo * HOUR_MS)
  })));

  const start = new Date(now - 6 * 24 * HOUR_MS);
  await Goal.create({
    userId,
    targetPoints: 40,
    goalType: 'weekly',
    startDate: start,
    endDate: new Date(start.getTime() + 7 * 24 * HOUR_MS)
  });

  await BadgeService.updateStatsOnGoalCreation(userId);
  await BadgeService.recalculateStats(userId);
}

// Wipes everything the demo account owns and re-seeds it
async function resetDemoData() {
  const user = await ensureDemoUser();
  const userId = String(user._id);
  await Promise.all([
    Activity.deleteMany({ userId }),
    Goal.deleteMany({ userId }),
    Badge.deleteMany({ userId }),
    UserStats.deleteMany({ userId })
  ]);
  await seedDemoData(userId);
  user.demoResetAt = new Date();
  await user.save();
  console.log('🧹 Demo data reset');
}

// Resets the demo only if it hasn't been reset recently (or ever)
async function resetDemoIfStale() {
  const user = await ensureDemoUser();
  const age = user.demoResetAt ? Date.now() - user.demoResetAt.getTime() : Infinity;
  if (age >= resetIntervalMs()) await resetDemoData();
}

async function isDemoAtActivityLimit(userId) {
  if (String(userId) !== await getDemoUserId()) return false;
  return (await Activity.countDocuments({ userId: String(userId) })) >= MAX_DEMO_ACTIVITIES;
}

module.exports = {
  ensureDemoUser,
  getDemoUserId,
  resetDemoData,
  resetDemoIfStale,
  isDemoAtActivityLimit,
  MAX_DEMO_ACTIVITIES
};
