import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { asyncHandler } from '../utils/asyncHandler'
import {
  getDashboardStats,
  getLeadAnalytics,
  getCampaignAnalytics,
  getTaskAnalytics,
  getActivityFeed,
  getConversionFunnel
} from '../controllers/analytics.controller'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Analytics routes
router.get('/dashboard', asyncHandler(getDashboardStats))
router.get('/leads', asyncHandler(getLeadAnalytics))
router.get('/campaigns', asyncHandler(getCampaignAnalytics))
router.get('/tasks', asyncHandler(getTaskAnalytics))
router.get('/activity-feed', asyncHandler(getActivityFeed))
router.get('/conversion-funnel', asyncHandler(getConversionFunnel))

export default router
