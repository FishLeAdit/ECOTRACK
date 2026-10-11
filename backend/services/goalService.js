const Goal = require('../models/goal');
const Activity = require('../models/activity');

function nextEndDate(from, goalType) {
  const end = new Date(from);
  switch (goalType) {
    case 'daily': end.setDate(end.getDate() + 1); break;
    case 'weekly': end.setDate(end.getDate() + 7); break;
    case 'monthly': end.setMonth(end.getMonth() + 1); break;
  }
  return end;
}

// Recomputes progress for a user's active goals from their activities, marks goals as
// completed / expired, and rolls expired goals over into a fresh period.
// Because progress is always recomputed, edited or deleted activities self-correct here.
async function refreshGoals(userId) {
  const goals = await Goal.find({ userId, isArchived: false });
  const now = new Date();

  for (const goal of goals) {
    const activities = await Activity.find({
      userId: goal.userId,
      date: { $gte: goal.startDate, $lt: now }
    }).select('points').lean();

    goal.currentPoints = activities.reduce((sum, act) => sum + act.points, 0);

    if (goal.currentPoints >= goal.targetPoints) {
      goal.isCompleted = true;
      goal.wasSuccessful = true;
      goal.completionDate = goal.completionDate || now;
    } else if (now > new Date(goal.endDate)) {
      // Expired without completion: archive it and start a new period
      goal.isCompleted = true;
      goal.wasSuccessful = false;
      goal.completionDate = now;
      goal.isArchived = true;

      await new Goal({
        userId: goal.userId,
        targetPoints: goal.targetPoints,
        startDate: now,
        endDate: nextEndDate(now, goal.goalType),
        goalType: goal.goalType,
        currentPoints: 0,
        isCompleted: false,
        isArchived: false
      }).save();
    } else if (goal.isCompleted) {
      // Was complete, but an edited/deleted activity dropped it back under target
      goal.isCompleted = false;
      goal.wasSuccessful = undefined;
      goal.completionDate = undefined;
    }

    await goal.save();
  }
}

// Hourly job: refresh every user that has an active goal
async function refreshAllGoals() {
  const userIds = await Goal.distinct('userId', { isArchived: false });
  for (const userId of userIds) {
    try {
      await refreshGoals(userId);
    } catch (err) {
      console.error(`⚠️ Goal refresh failed for ${userId}:`, err.message);
    }
  }
  return userIds.length;
}

module.exports = { refreshGoals, refreshAllGoals, nextEndDate };
