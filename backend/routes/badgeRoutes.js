const express = require('express');
const Badge = require('../models/badge');
const BadgeService = require('../services/badgeService');

const router = express.Router();

// Badge endpoints are scoped to the logged-in user (req.userId)

// GET: the user's badges
router.get('/', async (req, res) => {
  res.json(await BadgeService.getUserBadges(req.userId));
});

// GET: the most recently earned badges
router.get('/recent', async (req, res) => {
  const badges = await Badge.find({ userId: req.userId }).sort({ earnedDate: -1 }).limit(3);
  res.json(badges);
});

module.exports = router;
