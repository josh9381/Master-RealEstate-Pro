import express from 'express';
import {
  getCurrentSubscription,
  getAvailablePlans,
  changePlan,
  getUsageStats,
} from '../controllers/subscription.controller';
import { requireAdmin } from '../middleware/admin';

const router = express.Router();

// All routes in this file require authentication
// Auth middleware is applied at the app level when registering this router

/**
 * @route   GET /api/subscriptions/current
 * @desc    Get current subscription for the organization
 * @access  Private (All authenticated users)
 */
router.get('/current', getCurrentSubscription);

/**
 * @route   GET /api/subscriptions/plans
 * @desc    Get all available subscription plans
 * @access  Private (All authenticated users)
 */
router.get('/plans', getAvailablePlans);

/**
 * @route   GET /api/subscriptions/usage
 * @desc    Get usage statistics for the organization
 * @access  Private (All authenticated users)
 */
router.get('/usage', getUsageStats);

/**
 * @route   POST /api/subscriptions/change-plan
 * @desc    Change subscription plan (manual upgrade/downgrade)
 * @access  Private (Admin only)
 */
router.post('/change-plan', requireAdmin, changePlan);

export default router;
