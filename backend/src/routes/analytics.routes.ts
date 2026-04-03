import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { asyncHandler } from '../utils/asyncHandler'
import { cacheResponse } from '../middleware/cache'
import { CACHE_TTL } from '../config/cache'
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
  getUsageStats,
} from '../controllers/analytics'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Dashboard & overview
router.get('/dashboard', cacheResponse(CACHE_TTL.DASHBOARD), asyncHandler(getDashboardStats))
router.get('/dashboard-alerts', cacheResponse(CACHE_TTL.DASHBOARD), asyncHandler(getDashboardAlerts))

// Lead & campaign analytics
router.get('/leads', cacheResponse(CACHE_TTL.STANDARD), asyncHandler(getLeadAnalytics))
router.get('/campaigns', cacheResponse(CACHE_TTL.STANDARD), asyncHandler(getCampaignAnalytics))
router.get('/tasks', cacheResponse(CACHE_TTL.STANDARD), asyncHandler(getTaskAnalytics))
router.get('/activity-feed', asyncHandler(getActivityFeed))
router.get('/conversion-funnel', cacheResponse(CACHE_TTL.STANDARD), asyncHandler(getConversionFunnel))

// Performance analytics — heavy queries, infrequently changing
router.get('/monthly-performance', cacheResponse(CACHE_TTL.HEAVY), asyncHandler(getMonthlyPerformance))
router.get('/hourly-engagement', cacheResponse(CACHE_TTL.HEAVY), asyncHandler(getHourlyEngagement))
router.get('/team-performance', cacheResponse(CACHE_TTL.HEAVY), asyncHandler(getTeamPerformance))
router.get('/revenue-timeline', cacheResponse(CACHE_TTL.HEAVY), asyncHandler(getRevenueTimeline))
router.get('/pipeline-metrics', cacheResponse(CACHE_TTL.HEAVY), asyncHandler(getPipelineMetrics))
router.get('/device-breakdown', cacheResponse(CACHE_TTL.HEAVY), asyncHandler(getDeviceBreakdown))
router.get('/geographic', cacheResponse(CACHE_TTL.HEAVY), asyncHandler(getGeographicBreakdown))

// Phase 5: Attribution, comparison, velocity, ROI, follow-up analytics
router.get('/attribution', cacheResponse(CACHE_TTL.HEAVY), asyncHandler(getAttributionReport))
router.get('/attribution/touchpoints/:leadId', cacheResponse(CACHE_TTL.DASHBOARD), asyncHandler(getLeadTouchpoints))
router.get('/comparison', cacheResponse(CACHE_TTL.HEAVY), asyncHandler(getPeriodComparison))
router.get('/lead-velocity', cacheResponse(CACHE_TTL.HEAVY), asyncHandler(getLeadVelocity))
router.get('/source-roi', cacheResponse(CACHE_TTL.HEAVY), asyncHandler(getSourceROI))
router.get('/follow-up-analytics', cacheResponse(CACHE_TTL.HEAVY), asyncHandler(getFollowUpAnalytics))

// Usage analytics — server-side aggregation
router.get('/usage-stats', cacheResponse(CACHE_TTL.STANDARD), asyncHandler(getUsageStats))

// Filter options — distinct values from the database
router.get('/lead-sources', cacheResponse(CACHE_TTL.HEAVY), asyncHandler(getLeadSources))

export default router
