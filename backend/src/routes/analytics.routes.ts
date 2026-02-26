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
} from '../controllers/analytics.controller'

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

export default router
