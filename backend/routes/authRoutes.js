const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { validate } = require('../middleware/validate');
const { signToken, requireAuth } = require('../middleware/auth');
const demoService = require('../services/demoService');
const { DEMO_USERNAME } = require('../config');

const router = express.Router();

// Compared against when a username doesn't exist, so response time doesn't reveal which usernames are taken
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const publicUser = user => ({ id: String(user._id), username: user.username, isDemo: !!user.isDemo });
const session = user => ({ token: signToken(user._id), user: publicUser(user) });

router.post('/register', validate('register'), async (req, res) => {
  const { username, password } = req.body;
  const usernameLower = username.toLowerCase();

  if (usernameLower === DEMO_USERNAME) {
    return res.status(409).json({ error: 'That username is taken' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, usernameLower, passwordHash });
    res.status(201).json(session(user));
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'That username is taken' });
    throw err;
  }
});

router.post('/login', validate('login'), async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ usernameLower: username.toLowerCase() });
  const matches = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  // The demo account is entered through /demo only
  if (!user || user.isDemo || !matches) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  res.json(session(user));
});

// Logs into the shared demo account (no credentials needed). Its data is wiped and
// re-seeded every DEMO_RESET_HOURS, checked lazily here as well as by the hourly job.
router.post('/demo', async (req, res) => {
  await demoService.resetDemoIfStale();
  const user = await demoService.ensureDemoUser();
  res.json(session(user));
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });
  res.json({ user: publicUser(user) });
});

module.exports = router;
