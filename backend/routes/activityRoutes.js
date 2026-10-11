const express = require('express');
const mongoose = require('mongoose');
const Activity = require('../models/activity');
const BadgeService = require('../services/badgeService');
const demoService = require('../services/demoService');
const { co2Of, round2 } = require('../services/impactService');
const { validate } = require('../middleware/validate');
const { CO2_KG_PER_POINT } = require('../config');

const router = express.Router();

const typeFor = points => (points > 0 ? 'Positive' : 'Negative');
const defaultCo2 = points => round2(points * CO2_KG_PER_POINT);

function notFound(res) {
  return res.status(404).json({ error: 'Activity not found' });
}

// Spreadsheet apps run text starting with = + - @ as a formula. Prefix those so a
// malicious activity name can't execute when the exported CSV is opened.
function csvCell(value) {
  let text = value === undefined || value === null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text))) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// GET: the current user's activities, newest first
router.get('/', async (req, res) => {
  const activities = await Activity.find({ userId: req.userId }).sort({ date: -1 });
  res.json(activities);
});

// GET: CSV download of the current user's activities
router.get('/export.csv', async (req, res) => {
  const activities = await Activity.find({ userId: req.userId }).sort({ date: -1 }).lean();
  const rows = [['Date', 'Activity', 'Type', 'Category', 'Points', 'CO2 kg (estimate)']];
  for (const a of activities) {
    rows.push([
      new Date(a.date).toISOString(),
      a.activityName,
      a.type,
      a.category || 'General',
      a.points,
      round2(co2Of(a))
    ]);
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ecotrack-activities.csv"');
  // BOM so Excel opens the file as UTF-8
  res.send('﻿' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n');
});

// POST: log an activity
router.post('/', validate('createActivity'), async (req, res) => {
  if (await demoService.isDemoAtActivityLimit(req.userId)) {
    return res.status(429).json({ error: 'The demo account is full. It resets automatically every few hours.' });
  }

  const { activityName, points, category, co2Kg } = req.body;
  const activity = await Activity.create({
    userId: req.userId,
    activityName,
    points,
    category: category || 'General',
    type: typeFor(points),
    co2Kg: co2Kg ?? defaultCo2(points),
    date: new Date()
  });

  const { newBadges } = await BadgeService.recalculateStats(req.userId, req.tzOffset);
  res.status(201).json({ activity, newBadges });
});

// PUT: edit one of the current user's activities
router.put('/:id', validate('updateActivity'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

  const activity = await Activity.findOne({ _id: req.params.id, userId: req.userId });
  if (!activity) return notFound(res);

  const { activityName, points, category, co2Kg } = req.body;
  if (activityName !== undefined) activity.activityName = activityName;
  if (category !== undefined) activity.category = category;
  if (points !== undefined) {
    activity.points = points;
    activity.type = typeFor(points);
  }
  // Explicit CO2 wins; null asks for the points-based default; otherwise keep what's stored
  if (co2Kg !== undefined) {
    activity.co2Kg = co2Kg ?? defaultCo2(activity.points);
  } else if (points !== undefined && typeof activity.co2Kg !== 'number') {
    activity.co2Kg = defaultCo2(points);
  }
  await activity.save();

  const { newBadges } = await BadgeService.recalculateStats(req.userId, req.tzOffset);
  res.json({ activity, newBadges });
});

// DELETE: remove one of the current user's activities
router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

  const deleted = await Activity.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!deleted) return notFound(res);

  await BadgeService.recalculateStats(req.userId, req.tzOffset);
  res.json({ message: 'Activity deleted successfully' });
});

module.exports = router;
