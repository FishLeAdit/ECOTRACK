const { z } = require('zod');
const { CATEGORIES } = require('../config');

const nonZeroPoints = z.number({ error: 'Points must be a number' })
  .int('Points must be a whole number')
  .min(-1000, 'Points must be between -1000 and 1000')
  .max(1000, 'Points must be between -1000 and 1000')
  .refine(n => n !== 0, 'Points cannot be zero');

const activityName = z.string({ error: 'Activity name is required' })
  .trim()
  .min(1, 'Activity name is required')
  .max(100, 'Activity name must be 100 characters or fewer');

const category = z.enum(CATEGORIES, { error: 'Unknown category' });

const co2Kg = z.number({ error: 'CO₂ must be a number' })
  .min(-10000, 'CO₂ must be between -10000 and 10000 kg')
  .max(10000, 'CO₂ must be between -10000 and 10000 kg');

const schemas = {
  register: z.object({
    username: z.string({ error: 'Username is required' }).trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be 30 characters or fewer')
      .regex(/^[A-Za-z0-9_.-]+$/, 'Username can only use letters, numbers, dots, dashes and underscores'),
    password: z.string({ error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be 72 characters or fewer')
  }),

  login: z.object({
    username: z.string({ error: 'Username is required' }).trim().min(1, 'Username is required').max(30),
    password: z.string({ error: 'Password is required' }).min(1, 'Password is required').max(72)
  }),

  // type is derived from the sign of points on the server, so it is not accepted here
  createActivity: z.object({
    activityName,
    points: nonZeroPoints,
    category: category.optional(),
    co2Kg: co2Kg.nullish()
  }),

  updateActivity: z.object({
    activityName: activityName.optional(),
    points: nonZeroPoints.optional(),
    category: category.optional(),
    co2Kg: co2Kg.nullish()
  }).refine(body => Object.keys(body).length > 0, 'Nothing to update'),

  createGoal: z.object({
    targetPoints: z.coerce.number({ error: 'Target points must be a number' })
      .int('Target points must be a whole number')
      .min(1, 'Target points must be at least 1')
      .max(100000, 'Target points must be 100000 or fewer'),
    goalType: z.enum(['daily', 'weekly', 'monthly'], { error: 'Goal type must be daily, weekly or monthly' }),
    endDate: z.coerce.date({ error: 'End date is not a valid date' })
  }),

  updateGoal: z.object({
    currentPoints: z.number({ error: 'Current points must be a number' }).min(0).max(1000000)
  })
};

// Express middleware: validates req.body and replaces it with the parsed value
function validate(schemaName) {
  const schema = schemas[schemaName];
  return (req, res, next) => {
    const result = schema.safeParse(req.body || {});
    if (!result.success) {
      const issues = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
      return res.status(400).json({ error: issues[0].message, issues });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
