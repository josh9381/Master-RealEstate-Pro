import api from './client'

export interface AppointmentsQuery {
  page?: number
  limit?: number
  status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  leadId?: string
  startDate?: string
  endDate?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CreateAppointmentData {
  leadId?: string
  title: string
  description?: string
  type: 'CALL' | 'MEETING' | 'DEMO' | 'CONSULTATION' | 'FOLLOW_UP'
  startTime: string
  endTime: string
  location?: string
  meetingUrl?: string
  notes?: string
  attendees?: {
    email: string
    name: string
    confirmed?: boolean
  }[]
}

export interface UpdateAppointmentData {
  title?: string
  description?: string
  type?: 'CALL' | 'MEETING' | 'DEMO' | 'CONSULTATION' | 'FOLLOW_UP'
  startTime?: string
  endTime?: string
  location?: string
  meetingUrl?: string
  notes?: string
  status?: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
  attendees?: {
    email: string
    name: string
    confirmed?: boolean
  }[]
}

export interface CalendarQuery {
  startDate: string
  endDate: string
  leadId?: string
}

export interface UpcomingQuery {
  days?: number
  limit?: number
}

export interface SendReminderData {
  method: 'email' | 'sms' | 'both'
  customMessage?: string
}

export const appointmentsApi = {
  getAppointments: async (params?: AppointmentsQuery) => {
    const response = await api.get('/appointments', { params })
    return response.data
  },

  getAppointment: async (id: string) => {
    const response = await api.get(`/appointments/${id}`)
    return response.data
  },

  createAppointment: async (data: CreateAppointmentData) => {
    const response = await api.post('/appointments', data)
    return response.data
  },

  updateAppointment: async (id: string, data: UpdateAppointmentData) => {
    const response = await api.put(`/appointments/${id}`, data)
    return response.data
  },

  cancelAppointment: async (id: string) => {
    const response = await api.delete(`/appointments/${id}`)
    return response.data
  },

  confirmAppointment: async (id: string) => {
    const response = await api.patch(`/appointments/${id}/confirm`)
    return response.data
  },

  sendReminder: async (id: string, data: SendReminderData) => {
    const response = await api.post(`/appointments/${id}/reminder`, data)
    return response.data
  },

  getCalendar: async (params: CalendarQuery) => {
    const response = await api.get('/appointments/calendar', { params })
    return response.data
  },

  getUpcoming: async (params?: UpcomingQuery) => {
    const response = await api.get('/appointments/upcoming', { params })
    return response.data
  },

  exportICS: async (id: string) => {
    const response = await api.get(`/appointments/${id}/ics`, { responseType: 'blob' })
    return response.data
  },
}
