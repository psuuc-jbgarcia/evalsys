require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();

// Trust Render/Vercel proxy headers so rate limiting uses the real client IP.
app.set('trust proxy', 1);

// Limit only login attempts. A global limiter can block many users sharing
// the same school/network IP while they are actively using the system.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/auth/login', loginLimiter);

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/sections', require('./routes/section.routes'));
app.use('/api/groups', require('./routes/group.routes'));
app.use('/api/evaluations', require('./routes/evaluation.routes'));
app.use('/api/rubrics', require('./routes/rubric.routes'));
app.use('/api/settings', require('./routes/settings.routes'));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
