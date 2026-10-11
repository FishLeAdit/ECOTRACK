const express = require('express');
const mongoose = require('mongoose');
const Goal = require('../models/goal');
const BadgeService = require('../services/badgeService');
const { refreshGoals, nextEndDate } = require('../services/goalService');
const { validate } = require('../middleware/validate');

const router = express.Router();

function notFound(res) {
  return res.status(404).json({ error: 'Goal not found' });
}

// Loads a goal only if it belongs to the current user
async function findOwnGoal(req) {
  if (!mongoose.isValidObjectId(req.params.id)) return null;
  return Goal.findOne({ _id: req.params.id, userId: req.userId });
}

// POST: create a goal
router.post('/', validate('createGoal'), async (req, res) => {
  const { targetPoints, endDate, goalType } = req.body;
  if (endDate <= new Date()) {
    return res.status(400).json({ error: 'End date must be in the future' });
  }

  const goal = await Goal.create({
    userId: req.userId,
    targetPoints,
    endDate,
    goalType,
    currentPoints: 0,
    startDate: new Date()
  });

  // Goal-creation badges are a bonus, so a failure here shouldn't fail the request
  let newBadges = [];
  try {
    ({ newBadges } = await BadgeService.updateStatsOnGoalCreation(req.userId));
  } catch (err) {
    console.error('⚠️ Stats update after goal creation failed:', err.message);
  }
  res.status(201).json({ goal, newBadges });
});

// GET: active goals (progress is recalculated first)
router.get('/', async (req, res) => {
  await refreshGoals(req.userId);
  const goals = await Goal.find({ userId: req.userId, isArchived: false }).sort({ startDate: -1 });
  res.json(goals);
});

// GET: archived goals, newest first
router.get('/history', async (req, res) => {
  const history = await Goal.find({ userId: req.userId, isArchived: true }).sort({ completionDate: -1 });
  res.json(history);
});

// PUT: update a goal's progress
router.put('/:id', validate('updateGoal'), async (req, res) => {
  const goal = await findOwnGoal(req);
  if (!goal) return notFound(res);

  goal.currentPoints = req.body.currentPoints;
  await goal.save();
  res.json(goal);
});

// DELETE: remove a goal
router.delete('/:id', async (req, res) => {
  const goal = await findOwnGoal(req);
  if (!goal) return notFound(res);

  await goal.deleteOne();
  res.json({ message: 'Goal deleted successfully' });
});

// PUT: archive a completed goal and start the next period
router.put('/:id/archive', async (req, res) => {
  const goal = await findOwnGoal(req);
  if (!goal) return notFound(res);

  if (goal.isArchived) return res.json({ message: 'Goal already archived', goal, newBadges: [] });
  if (!goal.isCompleted) return res.status(400).json({ error: 'Goal is not completed' });

  goal.isArchived = true;
  goal.completionDate = goal.completionDate || new Date();
  goal.wasSuccessful = true;
  await goal.save();

  let newBadges = [];
  try {
    ({ newBadges } = await BadgeService.updateStatsOnGoalCompletion(req.userId));
  } catch (err) {
    console.error('⚠️ Stats update after goal completion failed:', err.message);
  }

  const now = new Date();
  const endDate = nextEndDate(now, goal.goalType);
  const newGoal = await Goal.create({
    userId: goal.userId,
    targetPoints: goal.targetPoints,
    startDate: now,
    endDate,
    goalType: goal.goalType,
    currentPoints: 0,
    isCompleted: false,
    isArchived: false
  });

  res.json({ message: 'Goal archived and new goal created', goal, newGoal, newBadges });
});

module.exports = router;
