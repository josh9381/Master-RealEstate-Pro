import rateLimit from 'express-rate-limit';

// More lenient rate limiting in development, strict in production
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * General API rate limiter
 * Development: 10000 requests per 15 minutes (very lenient for testing)
 * Production: 100 requests per 15 minutes
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 10000 : 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: () => process.env.NODE_ENV === 'test' || isDevelopment, // Skip in test and development
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
  skip: () => process.env.NODE_ENV === 'test',
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
  skip: () => process.env.NODE_ENV === 'test',
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
  skip: () => process.env.NODE_ENV === 'test',
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
  skip: () => process.env.NODE_ENV === 'test',
});

