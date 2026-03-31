import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { asyncHandler } from '../utils/asyncHandler'
import { cacheResponse } from '../middleware/cache'
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
  getAttributionReport,
  getLeadTouchpoints,
  getPeriodComparison,
  getLeadVelocity,
  getSourceROI,
  getFollowUpAnalytics,
  getLeadSources,
} from '../controllers/analytics'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Dashboard & overview (cache 2 min)
router.get('/dashboard', cacheResponse(120), asyncHandler(getDashboardStats))
router.get('/dashboard-alerts', cacheResponse(120), asyncHandler(getDashboardAlerts))

// Lead & campaign analytics (cache 3 min)
router.get('/leads', cacheResponse(180), asyncHandler(getLeadAnalytics))
router.get('/campaigns', cacheResponse(180), asyncHandler(getCampaignAnalytics))
router.get('/tasks', cacheResponse(180), asyncHandler(getTaskAnalytics))
router.get('/activity-feed', asyncHandler(getActivityFeed))
router.get('/conversion-funnel', cacheResponse(180), asyncHandler(getConversionFunnel))

// Performance analytics (cache 5 min — heavy queries, infrequently changing)
router.get('/monthly-performance', cacheResponse(300), asyncHandler(getMonthlyPerformance))
router.get('/hourly-engagement', cacheResponse(300), asyncHandler(getHourlyEngagement))
router.get('/team-performance', cacheResponse(300), asyncHandler(getTeamPerformance))
router.get('/revenue-timeline', cacheResponse(300), asyncHandler(getRevenueTimeline))
router.get('/pipeline-metrics', cacheResponse(300), asyncHandler(getPipelineMetrics))
router.get('/device-breakdown', cacheResponse(300), asyncHandler(getDeviceBreakdown))
router.get('/geographic', cacheResponse(300), asyncHandler(getGeographicBreakdown))

// Phase 5: Attribution, comparison, velocity, ROI, follow-up analytics
router.get('/attribution', cacheResponse(300), asyncHandler(getAttributionReport))
router.get('/attribution/touchpoints/:leadId', cacheResponse(120), asyncHandler(getLeadTouchpoints))
router.get('/comparison', cacheResponse(300), asyncHandler(getPeriodComparison))
router.get('/lead-velocity', cacheResponse(300), asyncHandler(getLeadVelocity))
router.get('/source-roi', cacheResponse(300), asyncHandler(getSourceROI))
router.get('/follow-up-analytics', cacheResponse(300), asyncHandler(getFollowUpAnalytics))

// Filter options — distinct values from the database
router.get('/lead-sources', cacheResponse(300), asyncHandler(getLeadSources))

export default router
