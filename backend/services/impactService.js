const Activity = require('../models/activity');
const BadgeService = require('./badgeService');
const { CO2_KG_PER_POINT } = require('../config');

const round2 = n => Math.round(n * 100) / 100;

// Activities logged before CO2 tracking existed fall back to the points estimate
function co2Of(activity) {
  return typeof activity.co2Kg === 'number' ? activity.co2Kg : activity.points * CO2_KG_PER_POINT;
}

// CO2 saved (net of emissions) today / over the last 7 days / all time, plus streaks.
// "Today" follows the user's timezone (see readTimezone middleware).
async function getImpactSummary(userId, tzOffset = 0) {
  const activities = await Activity.find({ userId }).select('points category date co2Kg').lean();

  const todayKey = BadgeService.dayKey(new Date(), tzOffset);
  const todayNumber = BadgeService.dayNumber(todayKey);

  const co2 = { today: 0, week: 0, allTime: 0 };
  for (const activity of activities) {
    const value = co2Of(activity);
    const daysAgo = todayNumber - BadgeService.dayNumber(BadgeService.dayKey(activity.date, tzOffset));
    co2.allTime += value;
    if (daysAgo === 0) co2.today += value;
    if (daysAgo >= 0 && daysAgo < 7) co2.week += value;
  }

  const derived = BadgeService.computeDerivedStats(activities, tzOffset);

  return {
    co2: { today: round2(co2.today), week: round2(co2.week), allTime: round2(co2.allTime) },
    streak: { current: derived.currentStreak, longest: derived.longestStreak },
    totalActivities: activities.length,
    isEstimate: true
  };
}

module.exports = { getImpactSummary, co2Of, round2 };
