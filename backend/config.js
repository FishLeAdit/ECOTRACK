const CATEGORIES = [
  'General', 'Transportation', 'Energy', 'Waste', 'Food',
  'Water', 'Shopping', 'Home', 'Work', 'Recreation'
];

const DEMO_USERNAME = 'demo';

// Custom activities without an explicit CO2 figure fall back to this
const CO2_KG_PER_POINT = 0.1;

const isProduction = process.env.NODE_ENV === 'production';

// The JWT secret must be set in production. A fixed fallback is used for local
// development only, so restarting the dev server doesn't log everyone out.
function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (isProduction) {
    console.error('❌ JWT_SECRET must be set when NODE_ENV=production');
    process.exit(1);
  }
  console.warn('⚠️ JWT_SECRET not set - using an insecure development secret');
  return 'ecotrack-insecure-dev-secret';
}

module.exports = { CATEGORIES, DEMO_USERNAME, CO2_KG_PER_POINT, isProduction, getJwtSecret };
