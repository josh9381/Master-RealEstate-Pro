/**
 * Cache TTL configuration for analytics endpoints (in seconds).
 * Tune these values based on data freshness requirements and query cost.
 */
export const CACHE_TTL = {
  /** Dashboard and alerts — low latency, moderate freshness (2 min) */
  DASHBOARD: 120,
  /** Lead, campaign, task, funnel analytics (3 min) */
  STANDARD: 180,
  /** Heavy/infrequent queries: performance, attribution, velocity, ROI (5 min) */
  HEAVY: 300,
} as const
