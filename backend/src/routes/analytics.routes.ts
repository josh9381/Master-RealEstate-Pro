import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { asyncHandler } from '../utils/asyncHandler'
import {
  getDashboardStats,
  getLeadAnalytics,
  getCampaignAnalytics,
  getTaskAnalytics,
  getActivityFeed,
  getConversionFunnel,
  getMonthlyPerformance,
  getHourlyEngagement,
  getTeamPerformance,
  getRevenueTimeline,
  getDashboardAlerts,
  getPipelineMetrics,
  getDeviceBreakdown,
  getGeographicBreakdown,
} from '../controllers/analytics.controller'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Existing analytics routes
router.get('/dashboard', asyncHandler(getDashboardStats))
router.get('/leads', asyncHandler(getLeadAnalytics))
router.get('/campaigns', asyncHandler(getCampaignAnalytics))
router.get('/tasks', asyncHandler(getTaskAnalytics))
router.get('/activity-feed', asyncHandler(getActivityFeed))
router.get('/conversion-funnel', asyncHandler(getConversionFunnel))

// Phase 5: New analytics endpoints
router.get('/monthly-performance', asyncHandler(getMonthlyPerformance))
router.get('/hourly-engagement', asyncHandler(getHourlyEngagement))
router.get('/team-performance', asyncHandler(getTeamPerformance))
router.get('/revenue-timeline', asyncHandler(getRevenueTimeline))
router.get('/dashboard-alerts', asyncHandler(getDashboardAlerts))
router.get('/pipeline-metrics', asyncHandler(getPipelineMetrics))
router.get('/device-breakdown', asyncHandler(getDeviceBreakdown))
router.get('/geographic', asyncHandler(getGeographicBreakdown))

export default router
