const express = require('express');
const BadgeService = require('../services/badgeService');
const demoService = require('../services/demoService');
const { getImpactSummary } = require('../services/impactService');

const router = express.Router();

// GET /api/stats: the user's stats (streaks are evaluated against "now" in the user's timezone)
router.get('/stats', async (req, res) => {
  res.json(await BadgeService.getLiveStats(req.userId, req.tzOffset));
});

// GET /api/summary: CO2 saved today / this week / all time, plus streaks
router.get('/summary', async (req, res) => {
  res.json(await getImpactSummary(req.userId, req.tzOffset));
});

// GET /api/leaderboard/badges and /api/leaderboard/points (the shared demo account is excluded)
router.get('/leaderboard/badges', async (req, res) => {
  res.json(await BadgeService.getBadgeLeaderboard(await demoService.getDemoUserId()));
});

router.get('/leaderboard/points', async (req, res) => {
  res.json(await BadgeService.getPointsLeaderboard(await demoService.getDemoUserId()));
});

module.exports = router;
