import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import {
  unsubscribe,
  resubscribe,
  getPreferences,
  updatePreferences,
} from '../controllers/unsubscribe.controller';

const router = Router();

// Note: These routes are PUBLIC - no authentication required
// Users should be able to unsubscribe without logging in

/**
 * @route   GET /api/unsubscribe/:token
 * @desc    Unsubscribe a lead from email communications
 * @access  Public
 */
router.get('/:token', asyncHandler(unsubscribe));

/**
 * @route   GET /api/unsubscribe/:token/preferences
 * @desc    Get email preferences for a lead
 * @access  Public
 */
router.get('/:token/preferences', asyncHandler(getPreferences));

/**
 * @route   POST /api/unsubscribe/:token/resubscribe
 * @desc    Resubscribe a lead to email communications
 * @access  Public
 */
router.post('/:token/resubscribe', asyncHandler(resubscribe));

/**
 * @route   PATCH /api/unsubscribe/:token/preferences
 * @desc    Update email preferences
 * @access  Public
 */
router.patch('/:token/preferences', asyncHandler(updatePreferences));

export default router;
