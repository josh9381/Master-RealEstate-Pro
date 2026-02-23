import { Router } from 'express';
import { register, login, refresh, me, forgotPassword, resetPassword, logout } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema, refreshSchema } from '../validators/auth.validator';
import { asyncHandler } from '../utils/asyncHandler';
import { authLimiter, registerLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  registerLimiter,
  validateBody(registerSchema),
  asyncHandler(register)
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get tokens
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(login)
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post(
  '/refresh',
  validateBody(refreshSchema),
  asyncHandler(refresh)
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user information
 * @access  Private (requires authentication)
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(me)
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post(
  '/forgot-password',
  authLimiter,
  asyncHandler(forgotPassword)
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  asyncHandler(resetPassword)
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private (requires authentication)
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(logout)
);

export default router;
