/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = { user: { id: '1', role: 'admin' }, hasPermission: () => true }
      return selector ? selector(state) : state
    },
    { getState: () => ({ user: { id: '1', role: 'admin' }, hasPermission: () => true }) }
  ),
}))
vi.mock('@/lib/api', () => ({
  leadsApi: { list: vi.fn().mockResolvedValue({ data: { leads: [], total: 0, totalPages: 0 } }), delete: vi.fn() },
  usersApi: { listTeam: vi.fn().mockResolvedValue({ data: { users: [] } }) },
  notesApi: { list: vi.fn().mockResolvedValue({ data: { notes: [] } }) },
  messagesApi: { list: vi.fn().mockResolvedValue({ data: { messages: [] } }) },
  activitiesApi: { list: vi.fn().mockResolvedValue({ data: { activities: [] } }) },
  pipelinesApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
  tagsApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
  segmentsApi: { list: vi.fn().mockResolvedValue({ data: { segments: [] } }) },
  CreateLeadData: {},
  UpdateLeadData: {},
  BulkUpdateData: {},
  PipelineData: {},
}))
vi.mock('@/lib/exportService', () => ({
  exportToCSV: vi.fn(),
  leadExportColumns: [],
}))
vi.mock('@/components/filters/AdvancedFilters', () => ({
  AdvancedFilters: () => <div data-testid="advanced-filters" />,
}))
vi.mock('@/components/bulk/BulkActionsBar', () => ({
  BulkActionsBar: () => <div data-testid="bulk-actions" />,
}))
vi.mock('@/components/filters/ActiveFilterChips', () => ({
  ActiveFilterChips: () => <div data-testid="filter-chips" />,
}))
vi.mock('@/components/leads/SavedFilterViews', () => ({
  SavedFilterViews: () => <div data-testid="saved-filters" />,
}))
vi.mock('./list/LeadModals', () => ({
  MassEmailModal: () => <div />,
  TagsModal: () => <div />,
  StatusModal: () => <div />,
  AssignModal: () => <div />,
  BulkDeleteModal: () => <div />,
  EditLeadModal: () => <div />,
}))
vi.mock('./list/LeadsTable', () => ({
  LeadsTable: () => <div data-testid="leads-table" />,
}))
vi.mock('./list/LeadsGrid', () => ({
  LeadsGrid: () => <div data-testid="leads-grid" />,
}))

import LeadsList from '@/pages/leads/LeadsList'

describe('LeadsList', () => {
  it('renders without crashing', () => {
    renderWithProviders(<LeadsList />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
