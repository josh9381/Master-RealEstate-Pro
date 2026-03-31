import api from './client'

export interface FollowUpReminder {
  id: string
  leadId: string
  userId: string
  organizationId: string
  title: string
  note?: string
  dueAt: string
  status: 'PENDING' | 'FIRED' | 'COMPLETED' | 'SNOOZED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  channelInApp: boolean
  channelEmail: boolean
  channelSms: boolean
  channelPush: boolean
  firedAt?: string
  completedAt?: string
  snoozedUntil?: string
  isRecurring?: boolean
  recurrencePattern?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'
  recurrenceInterval?: number
  recurrenceEndDate?: string
  recurrenceCount?: number
  occurrenceNumber?: number
  parentReminderId?: string
  createdAt: string
  updatedAt: string
  lead?: {
    id: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
    company?: string
  }
}

export interface CreateReminderData {
  leadId: string
  title: string
  note?: string
  dueAt: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  channelInApp?: boolean
  channelEmail?: boolean
  channelSms?: boolean
  channelPush?: boolean
  isRecurring?: boolean
  recurrencePattern?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'
  recurrenceInterval?: number
  recurrenceEndDate?: string
  recurrenceCount?: number
}

export const remindersApi = {
  getReminders: async (params?: { leadId?: string; status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/reminders', { params })
    return response.data
  },

  getUpcoming: async () => {
    const response = await api.get('/reminders/upcoming')
    return response.data
  },

  getReminder: async (id: string) => {
    const response = await api.get(`/reminders/${id}`)
    return response.data
  },

  createReminder: async (data: CreateReminderData) => {
    const response = await api.post('/reminders', data)
    return response.data
  },

  updateReminder: async (id: string, data: Partial<CreateReminderData>) => {
    const response = await api.patch(`/reminders/${id}`, data)
    return response.data
  },

  completeReminder: async (id: string) => {
    const response = await api.patch(`/reminders/${id}/complete`)
    return response.data
  },

  snoozeReminder: async (id: string, snoozedUntil: string) => {
    const response = await api.patch(`/reminders/${id}/snooze`, { snoozedUntil })
    return response.data
  },

  deleteReminder: async (id: string) => {
    const response = await api.delete(`/reminders/${id}`)
    return response.data
  },
}
