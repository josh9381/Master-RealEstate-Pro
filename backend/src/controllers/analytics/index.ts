// Barrel re-export — all imports from '../controllers/analytics.controller' stay valid
export {
  getDashboardStats,
  getLeadAnalytics,
  getCampaignAnalytics,
  getTaskAnalytics,
  getActivityFeed,
  getConversionFunnel,
  getUsageStats,
} from './core'

export {
  getMonthlyPerformance,
  getHourlyEngagement,
  getTeamPerformance,
  getRevenueTimeline,
  getDashboardAlerts,
  getPipelineMetrics,
  getDeviceBreakdown,
  getGeographicBreakdown,
} from './performance'

export {
  getAttributionReport,
  getLeadTouchpoints,
  getPeriodComparison,
  getLeadVelocity,
  getSourceROI,
  getFollowUpAnalytics,
  getLeadSources,
} from './attribution'
