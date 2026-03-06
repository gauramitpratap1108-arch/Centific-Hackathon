import rateLimit from 'express-rate-limit';

/**
 * General API limiter: 100 requests per 15 minutes per IP.
 * Applied to all /api/ routes.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

/**
 * Auth limiter: 10 requests per 15 minutes per IP.
 * Applied to /api/auth only (login, register, refresh).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});


