import rateLimit from 'express-rate-limit';

// Skip rate limiting in test environment
const skip = () => process.env.NODE_ENV === 'test';

/**
 * General API rate limiter - 100 requests per 15 minutes
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip,
});

/**
 * Strict rate limiter for authentication endpoints - 5 requests per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
  skip,
});

/**
 * Registration rate limiter - 3 registrations per hour per IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    error: 'Too many accounts created from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip,
});

/**
 * Password reset rate limiter - 3 attempts per hour
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    error: 'Too many password reset attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip,
});

/**
 * Strict limiter for sensitive operations - 10 requests per 15 minutes
 */
export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: 'Too many requests for this operation, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip,
});

