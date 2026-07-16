require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const express = require('express');
const cors = require('cors');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const connectDB = require('./config/db');
const { invalidateCacheOnMutation } = require('./middleware/cache.middleware');

const app = express();

// Trust Render/Vercel proxy headers so rate limiting uses the real client IP.
app.set('trust proxy', 1);

// Limit only login attempts. A global limiter can block many users sharing
// the same school/network IP while they are actively using the system.
const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const account = String(req.body?.email || '').trim().toLowerCase();
    return account || ipKeyGenerator(req.ip);
  },
  skipSuccessfulRequests: true,
  message: { message: 'Too many attempts for this account. Please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://[::1]:5173',
];

const configuredAllowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGINS,
]
  .filter(Boolean)
  .flatMap((value) => value.split(','))
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = new Set([
  ...defaultAllowedOrigins,
  ...configuredAllowedOrigins,
]);

const isPrivateDevelopmentOrigin = (origin) => {
  if (process.env.NODE_ENV === 'production') return false;

  try {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.local') ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    );
  } catch {
    return false;
  }
};

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.has(normalizedOrigin) || isPrivateDevelopmentOrigin(normalizedOrigin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${normalizedOrigin}`));
  },
}));
app.use(express.json({ limit: '10mb' }));
app.use(invalidateCacheOnMutation);

app.use('/api/auth/login', loginIpLimiter, loginAccountLimiter);

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/sections', require('./routes/section.routes'));
app.use('/api/groups', require('./routes/group.routes'));
app.use('/api/evaluations', require('./routes/evaluation.routes'));
app.use('/api/rubrics', require('./routes/rubric.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/subjects', require('./routes/subject.routes'));
app.use('/api/registration-links', require('./routes/registrationLink.routes'));
app.use('/api/usage', require('./routes/usage.routes'));
app.use('/api/legacy-data', require('./routes/legacyData.routes'));
app.use('/api/operations', require('./routes/operations.routes'));
app.use('/api/jobs', require('./routes/job.routes'));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

start().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});

