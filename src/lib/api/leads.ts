import api from './client'

export interface LeadsQuery {
  page?: number
  limit?: number
  search?: string
  status?: string
  source?: string
  minScore?: number
  maxScore?: number
  assignedTo?: string
  tags?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CreateLeadData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  position?: string
  status?: string
  source?: string
  value?: number
  stage?: string
  assignedToId?: string
  notes?: string
  customFields?: Record<string, unknown>
  tags?: string[]
  // Real-estate specific fields
  propertyType?: string
  transactionType?: string
  budgetMin?: number
  budgetMax?: number
  preApprovalStatus?: string
  moveInTimeline?: string
  desiredLocation?: string
  bedsMin?: number
  bathsMin?: number
}

export interface UpdateLeadData extends Partial<CreateLeadData> {
  score?: number
  pipelineId?: string
  pipelineStageId?: string
}

export interface BulkUpdateData {
  leadIds: string[]
  updates: Partial<UpdateLeadData>
}

export const leadsApi = {
  getLeads: async (params?: LeadsQuery) => {
    const response = await api.get('/leads', { params })
    return response.data
  },

  getLead: async (id: string) => {
    const response = await api.get(`/leads/${id}`)
    return response.data
  },

  createLead: async (data: CreateLeadData) => {
    const response = await api.post('/leads', data)
    return response.data
  },

  updateLead: async (id: string, data: UpdateLeadData) => {
    const response = await api.patch(`/leads/${id}`, data)
    return response.data
  },

  deleteLead: async (id: string) => {
    const response = await api.delete(`/leads/${id}`)
    return response.data
  },

  bulkUpdate: async (data: BulkUpdateData) => {
    const response = await api.post('/leads/bulk-update', data)
    return response.data
  },

  bulkDelete: async (leadIds: string[]) => {
    const response = await api.post('/leads/bulk-delete', { leadIds })
    return response.data
  },

  countFiltered: async (filters: Array<{ field: string; operator: string; value: string | number | string[] }>) => {
    const response = await api.post('/leads/count-filtered', { filters })
    return response.data
  },

  mergeLeads: async (data: { primaryLeadId: string; secondaryLeadId: string; fieldSelections?: Record<string, 'primary' | 'secondary'> }) => {
    const response = await api.post('/leads/merge', {
      primaryLeadId: data.primaryLeadId,
      secondaryLeadIds: [data.secondaryLeadId],
      fieldSelections: data.fieldSelections,
    })
    return response.data
  },

  importLeads: (formData: FormData) => api.post('/leads/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),

  previewImport: (formData: FormData) => api.post('/leads/import/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),

  checkImportDuplicates: (formData: FormData) => api.post('/leads/import/duplicates', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),

  scanDuplicates: async (config: { matchEmail?: boolean; matchPhone?: boolean; matchName?: boolean }) => {
    const response = await api.post('/leads/duplicates/scan', config)
    return response.data
  },

  getStats: async () => {
    const response = await api.get('/leads/stats')
    return response.data
  },
}

export interface CreateTagData {
  name: string
  color?: string
}

export const tagsApi = {
  getTags: async () => {
    const response = await api.get('/tags')
    return response.data
  },

  createTag: async (data: CreateTagData) => {
    const response = await api.post('/tags', data)
    return response.data
  },

  updateTag: async (id: string, data: Partial<CreateTagData>) => {
    const response = await api.put(`/tags/${id}`, data)
    return response.data
  },

  deleteTag: async (id: string) => {
    const response = await api.delete(`/tags/${id}`)
    return response.data
  },

  addTagsToLead: async (leadId: string, tagIds: string[]) => {
    const response = await api.post(`/leads/${leadId}/tags`, { tagIds })
    return response.data
  },

  removeTagFromLead: async (leadId: string, tagId: string) => {
    const response = await api.delete(`/leads/${leadId}/tags/${tagId}`)
    return response.data
  },
}

export interface CreateCustomFieldData {
  name: string
  fieldKey?: string
  type: 'text' | 'number' | 'date' | 'dropdown' | 'boolean' | 'textarea'
  required?: boolean
  options?: string[]
  order?: number
  defaultValue?: string
  placeholder?: string
  validation?: string
}

export const customFieldsApi = {
  getCustomFields: async () => {
    const response = await api.get('/custom-fields')
    return response.data
  },

  getCustomField: async (id: string) => {
    const response = await api.get(`/custom-fields/${id}`)
    return response.data
  },

  createCustomField: async (data: CreateCustomFieldData) => {
    const response = await api.post('/custom-fields', data)
    return response.data
  },

  updateCustomField: async (id: string, data: Partial<CreateCustomFieldData>) => {
    const response = await api.put(`/custom-fields/${id}`, data)
    return response.data
  },

  deleteCustomField: async (id: string) => {
    const response = await api.delete(`/custom-fields/${id}`)
    return response.data
  },

  reorderCustomFields: async (fieldIds: string[]) => {
    const response = await api.put('/custom-fields/reorder', { fieldIds })
    return response.data
  },
}

export const documentsApi = {
  getDocuments: async (leadId: string) => {
    const response = await api.get(`/leads/${leadId}/documents`)
    return response.data
  },

  uploadDocuments: async (leadId: string, files: File[]) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('documents', file))
    const response = await api.post(`/leads/${leadId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  deleteDocument: async (leadId: string, documentId: string) => {
    const response = await api.delete(`/leads/${leadId}/documents/${documentId}`)
    return response.data
  },
}

export interface CreateNoteData {
  leadId: string
  content: string
}

export const notesApi = {
  // Lead-specific notes (nested route)
  getLeadNotes: async (leadId: string) => {
    const response = await api.get(`/leads/${leadId}/notes`)
    return response.data
  },

  createNote: async (data: CreateNoteData) => {
    const response = await api.post('/notes', data)
    return response.data
  },

  // Standalone note operations
  getNote: async (id: string) => {
    const response = await api.get(`/notes/${id}`)
    return response.data
  },

  updateNote: async (id: string, content: string) => {
    const response = await api.put(`/notes/${id}`, { content })
    return response.data
  },

  deleteNote: async (id: string) => {
    const response = await api.delete(`/notes/${id}`)
    return response.data
  },
}
