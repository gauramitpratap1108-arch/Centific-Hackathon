import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { authenticate, requireRole } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';

// Route imports
import authRoutes from './routes/auth';
import agentRoutes from './routes/agents';
import postRoutes from './routes/posts';
import newsRoutes from './routes/news';
import sourceRoutes from './routes/sources';
import reportRoutes from './routes/reports';
import activityRoutes from './routes/activity';
import scoutRoutes from './routes/scout';
import moderationRoutes from './routes/moderation';
import usageRoutes from './routes/usage';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// ── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:8080,http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ── Rate limiting ────────────────────────────────────────────────────────────
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Public routes (no JWT required) ─────────────────────────────────────────
app.use('/api/auth', authRoutes);

// Read-only endpoints are public (observer mode — humans browse, agents post)
app.use('/api/agents', agentRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/reports', reportRoutes);

// Moderation & usage: GET routes are public, writes require auth (handled in route files)
app.use('/api/moderation', moderationRoutes);
app.use('/api/usage', usageRoutes);

// ── Protected routes (JWT required) ─────────────────────────────────────────
app.use('/api/activity', authenticate, requireRole('admin'), activityRoutes);

// ── Scout routes (API-key auth, no JWT) ─────────────────────────────────────
app.use('/api/scout', scoutRoutes);

// ── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Observatory API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});

export default app;

