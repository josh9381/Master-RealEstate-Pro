// Helper types for handling API data that might be objects
export interface TagObject {
  id: number | string
  name: string
  color?: string
}

export interface UserObject {
  id: number | string
  firstName: string
  lastName: string
  email?: string
  avatar?: string
}

export interface FilterConfig {
  status: string[]
  source: string[]
  scoreRange: [number, number]
  dateRange: { from: string; to: string }
  tags: string[]
  assignedTo: string[]
}

export type SortField = 'name' | 'company' | 'score' | 'status' | 'source' | 'createdAt'
export type SortDirection = 'asc' | 'desc' | null
export type ScoreFilterValue = 'ALL' | 'HOT' | 'WARM' | 'COOL' | 'COLD'

export interface LeadStats {
  total: number
  qualified: number
  qualifiedRate: number
  avgScore: number
  converted: number
  conversionRate: number
}

export interface ActivityItem {
  type: string
  desc: string
  time: string
  details: string
}

export const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export function getStatusVariant(status: string) {
  switch (status) {
    case 'qualified': return 'success'
    case 'contacted': return 'warning'
    case 'nurturing': return 'warning'
    case 'new': return 'secondary'
    case 'proposal': return 'default'
    case 'negotiation': return 'default'
    case 'won': return 'success'
    case 'lost': return 'destructive'
    default: return 'secondary'
  }
}

export function getTimeAgo(timestamp: string) {
  const now = new Date()
  const then = new Date(timestamp)
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`
  return then.toLocaleDateString()
}
