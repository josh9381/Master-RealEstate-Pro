import { Router } from 'express';
import { register, login, verify2FALogin, refresh, me, forgotPassword, resetPassword, logout, getActiveSessions, terminateSession, verifyEmail, resendVerification, terminateAllSessions, deleteAccount } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema, refreshSchema, verify2FASchema } from '../validators/auth.validator';
import { asyncHandler } from '../utils/asyncHandler';
import { authLimiter, registerLimiter, passwordResetLimiter } from '../middleware/rateLimiter';

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
 * @route   POST /api/auth/login/2fa-verify
 * @desc    Complete login with 2FA code
 * @access  Public
 */
router.post(
  '/login/2fa-verify',
  authLimiter,
  validateBody(verify2FASchema),
  asyncHandler(verify2FALogin)
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post(
  '/refresh',
  authLimiter,
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
  passwordResetLimiter,
  asyncHandler(forgotPassword)
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  passwordResetLimiter,
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

/**
 * @route   GET /api/auth/sessions
 * @desc    Get all active sessions for the current user
 * @access  Private (requires authentication)
 */
router.get(
  '/sessions',
  authenticate,
  asyncHandler(getActiveSessions)
);

/**
 * @route   DELETE /api/auth/sessions/:sessionId
 * @desc    Terminate a specific session
 * @access  Private (requires authentication)
 */
router.delete(
  '/sessions/:sessionId',
  authenticate,
  asyncHandler(terminateSession)
);

/**
 * @route   POST /api/auth/sessions/terminate-all
 * @desc    Terminate all other sessions
 * @access  Private (requires authentication)
 */
router.post(
  '/sessions/terminate-all',
  authenticate,
  asyncHandler(terminateAllSessions)
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 */
router.post(
  '/verify-email',
  authLimiter,
  asyncHandler(verifyEmail)
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Private (requires authentication)
 */
router.post(
  '/resend-verification',
  authenticate,
  asyncHandler(resendVerification)
);

/**
 * @route   POST /api/auth/delete-account
 * @desc    Delete user account (requires password confirmation)
 * @access  Private (requires authentication)
 */
router.post(
  '/delete-account',
  authenticate,
  asyncHandler(deleteAccount)
);

export default router;
