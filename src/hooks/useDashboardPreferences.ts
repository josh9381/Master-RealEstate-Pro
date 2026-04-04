import { useState, useCallback } from 'react'

export interface DashboardWidgetPrefs {
  // Overview tab
  revenueChart: boolean
  conversionFunnel: boolean
  leadSources: boolean
  campaignPerformance: boolean
  // Activity tab
  calendar: boolean
  appointments: boolean
  activityFeed: boolean
  tasks: boolean
  quickStats: boolean
  // Campaigns tab
  topCampaigns: boolean
  // Alerts tab
  alerts: boolean
}

const STORAGE_KEY = 'dashboard-widget-prefs'

const DEFAULT_PREFS: DashboardWidgetPrefs = {
  revenueChart: true,
  conversionFunnel: true,
  leadSources: true,
  campaignPerformance: true,
  calendar: true,
  appointments: true,
  activityFeed: true,
  tasks: true,
  quickStats: true,
  topCampaigns: true,
  alerts: true,
}

function loadPrefs(): DashboardWidgetPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw)
    // Merge with defaults so new widget keys are always present
    return { ...DEFAULT_PREFS, ...parsed }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function savePrefs(prefs: DashboardWidgetPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function useDashboardPreferences() {
  const [prefs, setPrefs] = useState<DashboardWidgetPrefs>(loadPrefs)

  const toggle = useCallback((key: keyof DashboardWidgetPrefs) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      savePrefs(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    const defaults = { ...DEFAULT_PREFS }
    savePrefs(defaults)
    setPrefs(defaults)
  }, [])

  return { prefs, toggle, reset }
}

export const WIDGET_GROUPS: { tab: string; widgets: { key: keyof DashboardWidgetPrefs; label: string }[] }[] = [
  {
    tab: 'Overview',
    widgets: [
      { key: 'revenueChart', label: 'Revenue & Deals Trend' },
      { key: 'conversionFunnel', label: 'Conversion Funnel' },
      { key: 'leadSources', label: 'Lead Sources' },
      { key: 'campaignPerformance', label: 'Campaign Performance' },
    ],
  },
  {
    tab: 'Activity & Schedule',
    widgets: [
      { key: 'quickStats', label: 'Quick Stats Strip' },
      { key: 'calendar', label: 'Calendar' },
      { key: 'appointments', label: 'Upcoming Appointments' },
      { key: 'activityFeed', label: 'Recent Activity' },
      { key: 'tasks', label: 'Upcoming Tasks' },
    ],
  },
  {
    tab: 'Campaigns',
    widgets: [
      { key: 'topCampaigns', label: 'Top Performing Campaigns' },
    ],
  },
  {
    tab: 'Alerts',
    widgets: [
      { key: 'alerts', label: 'Alerts & Notifications' },
    ],
  },
]
