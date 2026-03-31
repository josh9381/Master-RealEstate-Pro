import api from './client'

export const segmentsApi = {
  getSegments: async () => {
    const response = await api.get('/segments')
    return response.data
  },

  getSegment: async (id: string) => {
    const response = await api.get(`/segments/${id}`)
    return response.data
  },

  createSegment: async (data: { name: string; description?: string; rules: Array<Record<string, unknown> | { field: string; operator: string; value: string }>; matchType?: string; color?: string }) => {
    const response = await api.post('/segments', data)
    return response.data
  },

  updateSegment: async (id: string, data: Partial<{ name: string; description?: string; rules: Array<Record<string, unknown> | { field: string; operator: string; value: string }>; matchType?: string; color?: string; isActive?: boolean }>) => {
    const response = await api.patch(`/segments/${id}`, data)
    return response.data
  },

  deleteSegment: async (id: string) => {
    const response = await api.delete(`/segments/${id}`)
    return response.data
  },

  getSegmentMembers: async (id: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/segments/${id}/members`, { params })
    return response.data
  },

  refreshCounts: async () => {
    const response = await api.post('/segments/refresh')
    return response.data
  },
}

export interface PipelineStage {
  id: string
  name: string
  order: number
  color?: string
  description?: string
  isWinStage: boolean
  isLostStage: boolean
  pipelineId: string
}

export interface PipelineData {
  id: string
  name: string
  type: 'DEFAULT' | 'BUYER' | 'SELLER' | 'RENTAL' | 'COMMERCIAL' | 'CUSTOM'
  description?: string
  isDefault: boolean
  stages: PipelineStage[]
  _count?: { leads: number }
}

export const pipelinesApi = {
  getPipelines: async (): Promise<{ success: boolean; data: PipelineData[] }> => {
    const response = await api.get('/pipelines')
    return response.data
  },
  getPipeline: async (id: string): Promise<{ success: boolean; data: PipelineData }> => {
    const response = await api.get(`/pipelines/${id}`)
    return response.data
  },
  createPipeline: async (data: {
    name: string
    type?: string
    description?: string
    stages?: Array<{ name: string; color?: string; isWinStage?: boolean; isLostStage?: boolean }>
  }): Promise<{ success: boolean; data: PipelineData }> => {
    const response = await api.post('/pipelines', data)
    return response.data
  },
  updatePipeline: async (id: string, data: {
    name?: string
    description?: string
    isDefault?: boolean
  }): Promise<{ success: boolean; data: PipelineData }> => {
    const response = await api.put(`/pipelines/${id}`, data)
    return response.data
  },
  deletePipeline: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/pipelines/${id}`)
    return response.data
  },
  duplicatePipeline: async (id: string, name?: string): Promise<{ success: boolean; data: PipelineData }> => {
    const response = await api.post(`/pipelines/${id}/duplicate`, { name })
    return response.data
  },
  getPipelineLeads: async (id: string) => {
    const response = await api.get(`/pipelines/${id}/leads`)
    return response.data
  },
  moveLeadToStage: async (leadId: string, data: { pipelineId?: string; pipelineStageId: string }) => {
    const response = await api.patch(`/pipelines/leads/${leadId}/move`, data)
    return response.data
  },
  // Stage CRUD
  createStage: async (pipelineId: string, data: {
    name: string
    color?: string
    description?: string
    isWinStage?: boolean
    isLostStage?: boolean
    insertAfterOrder?: number
  }): Promise<{ success: boolean; data: PipelineStage }> => {
    const response = await api.post(`/pipelines/${pipelineId}/stages`, data)
    return response.data
  },
  updateStage: async (pipelineId: string, stageId: string, data: {
    name?: string
    color?: string
    description?: string
    isWinStage?: boolean
    isLostStage?: boolean
  }): Promise<{ success: boolean; data: PipelineStage }> => {
    const response = await api.put(`/pipelines/${pipelineId}/stages/${stageId}`, data)
    return response.data
  },
  deleteStage: async (pipelineId: string, stageId: string, moveLeadsToStageId?: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/pipelines/${pipelineId}/stages/${stageId}`, {
      data: { moveLeadsToStageId },
    })
    return response.data
  },
  reorderStages: async (pipelineId: string, stageIds: string[]): Promise<{ success: boolean; data: PipelineStage[] }> => {
    const response = await api.patch(`/pipelines/${pipelineId}/stages/reorder`, { stageIds })
    return response.data
  },
}

export interface SavedFilterView {
  id: string
  name: string
  icon?: string
  color?: string
  filterConfig: {
    status?: string[]
    source?: string[]
    scoreRange?: [number, number]
    dateRange?: { from: string; to: string }
    tags?: string[]
    assignedTo?: string[]
  }
  scoreFilter: string
  sortField?: string
  sortDirection?: string
  isDefault: boolean
  isShared: boolean
  createdAt: string
  updatedAt: string
}

export const savedFiltersApi = {
  list: async (): Promise<{ success: boolean; data: SavedFilterView[] }> => {
    const response = await api.get('/saved-filters')
    return response.data
  },
  create: async (data: Omit<SavedFilterView, 'id' | 'createdAt' | 'updatedAt'>) => {
    const response = await api.post('/saved-filters', data)
    return response.data
  },
  update: async (id: string, data: Partial<Omit<SavedFilterView, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const response = await api.patch(`/saved-filters/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await api.delete(`/saved-filters/${id}`)
    return response.data
  },
}
