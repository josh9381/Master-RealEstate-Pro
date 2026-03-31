import api from './client'

export const exportApi = {
  /**
   * Download server-generated export file
   * @param type - 'leads' | 'campaigns' | 'activities'
   * @param format - 'xlsx' | 'csv'
   * @param filters - optional query filters
   */
  download: async (
    type: 'leads' | 'campaigns' | 'activities',
    format: 'xlsx' | 'csv' = 'xlsx',
    filters?: {
      status?: string;
      source?: string;
      assignedTo?: string;
      dateFrom?: string;
      dateTo?: string;
      fields?: string[];
    }
  ) => {
    const params: Record<string, unknown> = { format };
    if (filters?.status) params.status = filters.status;
    if (filters?.source) params.source = filters.source;
    if (filters?.assignedTo) params.assignedTo = filters.assignedTo;
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;
    if (filters?.fields) params.fields = filters.fields.join(',');

    const response = await api.get(`/export/${type}`, {
      params,
      responseType: 'blob',
    });

    // Trigger browser download
    const blob = new Blob([response.data], {
      type: format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    a.download = `${type}_export_${timestamp}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return { success: true, records: 0 }; // record count not known from blob
  },
}

export const savedReportsApi = {
  list: async () => {
    const response = await api.get('/reports/saved');
    return response.data;
  },
  get: async (id: string) => {
    const response = await api.get(`/reports/saved/${id}`);
    return response.data;
  },
  create: async (data: { name: string; description?: string; type?: string; config: Record<string, unknown> }) => {
    const response = await api.post('/reports/saved', data);
    return response.data;
  },
  update: async (id: string, data: { name?: string; description?: string; type?: string; config?: Record<string, unknown> }) => {
    const response = await api.put(`/reports/saved/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/reports/saved/${id}`);
    return response.data;
  },
}

export const reportSchedulesApi = {
  list: async () => {
    const response = await api.get('/report-schedules')
    return response.data
  },
  create: async (data: {
    savedReportId: string
    frequency: string
    customInterval?: number
    dayOfWeek?: number
    dayOfMonth?: number
    timeOfDay?: string
    timezone?: string
    recipients?: string[]
  }) => {
    const response = await api.post('/report-schedules', data)
    return response.data
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/report-schedules/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await api.delete(`/report-schedules/${id}`)
    return response.data
  },
  getHistory: async (id: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/report-schedules/${id}/history`, { params })
    return response.data
  },
}

export const goalsApi = {
  list: async (params?: { active?: string }) => {
    const response = await api.get('/goals', { params })
    return response.data
  },
  get: async (id: string) => {
    const response = await api.get(`/goals/${id}`)
    return response.data
  },
  create: async (data: {
    name: string
    metricType: string
    targetValue: number
    startDate: string
    endDate: string
    period?: string
    notes?: string
  }) => {
    const response = await api.post('/goals', data)
    return response.data
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/goals/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await api.delete(`/goals/${id}`)
    return response.data
  },
}
