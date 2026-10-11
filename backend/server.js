require('dotenv').config(); // must run before ./config and ./middleware read process.env

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const { isProduction } = require('./config');
const { requireAuth, readTimezone } = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const activityRoutes = require('./routes/activityRoutes');
const goalRoutes = require('./routes/goalRoutes');
const badgeRoutes = require('./routes/badgeRoutes');
const statsRoutes = require('./routes/statsRoutes');
const demoService = require('./services/demoService');
const { refreshAllGoals } = require('./services/goalService');

const app = express();

// Behind a proxy (Render, etc.) the client IP comes from X-Forwarded-For; without this
// every visitor would share one IP and one rate-limit bucket.
app.set('trust proxy', 1);

// Security headers, CORS and body parsing
app.use(helmet());

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim().replace(/\/$/, ''))
  : true; // no FRONTEND_URL: allow any origin (local development)
if (isProduction && allowedOrigins === true) {
  console.warn('⚠️ FRONTEND_URL is not set - CORS is open to every origin');
}
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '10kb' }));

// Health check (also used to wake the server up)
app.get('/healthz', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({ status: dbConnected ? 'ok' : 'starting', db: dbConnected });
});

// Rate limiting
const limitMessage = { error: 'Too many requests, please slow down and try again shortly.' };
const limiter = (options) => rateLimit({
  windowMs: 15 * 60 * 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitMessage,
  ...options
});
// Generous general limit: logging one activity makes ~9 calls (it refreshes several panels), and
// people on the same network (a class, an office) share one IP. The auth limits below stay strict.
app.use('/api', limiter({ limit: 1500 }));
app.use('/api/auth/login', limiter({ limit: 10, skipSuccessfulRequests: true }));
app.use('/api/auth/register', limiter({ limit: 10 }));
app.use('/api/auth/demo', limiter({ limit: 30 }));

app.use('/api', readTimezone);

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Public routes
app.use('/api/auth', authRoutes);

// Everything below requires a logged-in user and is scoped to req.userId
app.use('/api/activities', requireAuth, activityRoutes);
app.use('/api/goals', requireAuth, goalRoutes);
app.use('/api/badges', requireAuth, badgeRoutes);
app.use('/api', requireAuth, statsRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware - MUST be last
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  if (err.name === 'CastError' || err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Invalid request data' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Something went wrong on our side. Please try again.',
    ...(isProduction ? {} : { details: err.message })
  });
});

// Connect to MongoDB, then make sure the demo account exists and is fresh
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ecotrack')
  .then(async () => {
    console.log('✅ MongoDB connected successfully');
    await demoService.resetDemoIfStale();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Hourly: refresh every user's goals and re-seed the demo account when it is due.
// (Goals also refresh whenever they are fetched, so a sleeping host loses nothing.)
setInterval(async () => {
  try {
    const users = await refreshAllGoals();
    await demoService.resetDemoIfStale();
    console.log(`🕐 Hourly job completed (${users} users with active goals)`);
  } catch (error) {
    console.error('⚠️ Hourly job failed:', error.message);
  }
}, 60 * 60 * 1000);
