// Common types used across the application

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'admin' | 'user' | 'manager'
  createdAt: string
}

export interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
  score: number
  source: string
  assignedTo?: string
  createdAt: string
  updatedAt: string
  tags?: string[]
  notes?: Note[]
}

export interface Campaign {
  id: string
  name: string
  type: 'email' | 'sms' | 'phone' | 'social'
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed'
  startDate?: string
  endDate?: string
  recipients: number
  sent: number
  opened: number
  clicked: number
  converted: number
  budget?: number
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  content: string
  author: string
  createdAt: string
}

export interface Activity {
  id: string
  type: 'email' | 'call' | 'meeting' | 'note' | 'status_change'
  title: string
  description?: string
  timestamp: string
  user: string
}

export interface Analytics {
  revenue: number
  revenueChange: number
  leads: number
  leadsChange: number
  conversion: number
  conversionChange: number
  campaigns: number
  campaignsChange: number
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
