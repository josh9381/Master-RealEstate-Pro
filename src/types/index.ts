// Common types used across the application

export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  name?: string
  avatar?: string
  role: 'admin' | 'user' | 'manager' | 'USER' | 'ADMIN'
  createdAt: string
}

export interface Lead {
  id: number
  name: string
  email: string
  phone?: string
  company?: string
  position?: string
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost' | 'negotiation'
  score: number
  source: string
  value?: number
  stage?: string
  assignedTo?: string | null
  createdAt: string
  updatedAt?: string
  lastContact?: string | null
  tags?: string[]
  notes?: string | Note[]
  customFields?: {
    industry?: string
    companySize?: number
    budget?: number
    website?: string
    address?: {
      street?: string
      city?: string
      state?: string
      zip?: string
      country?: string
    }
    [key: string]: unknown
  }
}

export interface Campaign {
  id: number | string
  name: string
  type: 'email' | 'sms' | 'phone' | 'social'
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed'
  startDate: string
  endDate?: string
  budget?: number
  spent?: number
  audience?: number
  recipients?: number
  sent: number
  opens?: number
  opened?: number
  clicks?: number
  clicked?: number
  conversions?: number
  converted?: number
  revenue?: number
  roi?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  tags?: string[]
  subject?: string | null
  previewText?: string
  abTest?: {
    variant: 'A' | 'B'
    winner?: 'A' | 'B'
    aOpens?: number
    bOpens?: number
    aClicks?: number
    bClicks?: number
  }
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
