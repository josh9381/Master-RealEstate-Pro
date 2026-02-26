import rateLimit from 'express-rate-limit';

// More lenient rate limiting in development, strict in production
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

/**
 * General API rate limiter (#89, #92)
 * Development: 10000 requests per 15 minutes (very lenient for testing)
 * Production: 300 requests per 15 minutes (raised from 100 — SPA makes many parallel calls on page load)
 * 
 * #89: Only skip in test mode, NOT in development. Rate limiting must be active by default.
 * If NODE_ENV is unset in production, rate limiting still applies.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 10000 : 300,
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: () => isTest, // Only skip in test — active in dev AND production
});

/**
 * Strict rate limiter for authentication endpoints
 * Development: 50 requests per 15 minutes (for testing)
 * Production: 5 requests per 15 minutes (strict)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 50 : 5,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
  skip: () => isTest,
});

/**
 * Registration rate limiter
 * Development: 50 registrations per hour (for testing)
 * Production: 3 registrations per hour per IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? 50 : 3,
  message: {
    success: false,
    error: 'Too many accounts created from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

/**
 * Password reset rate limiter
 * Development: 20 attempts per hour (for testing)
 * Production: 3 attempts per hour
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? 20 : 3,
  message: {
    success: false,
    error: 'Too many password reset attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

/**
 * Strict limiter for sensitive operations
 * Development: 100 requests per 15 minutes (for testing)
 * Production: 10 requests per 15 minutes
 */
export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 10,
  message: {
    success: false,
    error: 'Too many requests for this operation, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

/**
 * Webhook rate limiter (#90)
 * Prevents DDoS via webhook floods. Applies to /api/webhooks/* routes.
 * Production: 200 requests per minute per IP
 * Development: 2000 per minute (lenient for testing)
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 2000 : 200,
  message: {
    success: false,
    error: 'Too many webhook requests, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

/**
 * Export rate limiter (#91)
 * Export endpoints trigger heavy DB queries — limit to prevent abuse.
 * Production: 10 exports per 15 minutes per IP
 * Development: 100 per 15 minutes (lenient)
 */
export const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 10,
  message: {
    success: false,
    error: 'Too many export requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

