const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config');

const JWT_SECRET = getJwtSecret();
const TOKEN_TTL = '7d';

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// Requires "Authorization: Bearer <token>" and exposes the user's id as req.userId.
// Routes must use req.userId and never trust a userId from the body or URL.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

// The frontend sends its UTC offset (Date#getTimezoneOffset, in minutes) so "today"
// and streak days follow the user's own calendar and not the server's.
function readTimezone(req, res, next) {
  const offset = parseInt(req.headers['x-tz-offset'], 10);
  req.tzOffset = Number.isFinite(offset) && Math.abs(offset) <= 840 ? offset : 0;
  next();
}

module.exports = { signToken, requireAuth, readTimezone };
