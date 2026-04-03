/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useParams: () => ({ id: '1' }), useNavigate: () => vi.fn() }
})

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/metricsCalculator', () => ({
  fmtMoney: vi.fn(() => '$0'),
  calcRate: vi.fn(() => 0),
  formatRate: vi.fn(() => '0%'),
  calcProgress: vi.fn(() => 0),
  calcRateClamped: vi.fn(() => 0),
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = { user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'admin', subscription: { plan: 'pro', status: 'active' } }, isAdmin: () => true, hasPermission: () => true, getSubscriptionTier: () => 'pro', isTrialActive: () => false }
      return selector ? selector(state) : state
    },
    { getState: () => ({ user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'admin' }, isAdmin: () => true, getSubscriptionTier: () => 'pro' }) }
  ),
}))

vi.mock('@/lib/api', () => ({
  leadsApi: {
    getById: vi.fn().mockResolvedValue({ data: { id: '1', firstName: 'Test', lastName: 'Lead', email: 'test@test.com', status: 'new', score: 50 } }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
  notesApi: {
    getByLead: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: {} }),
  },
  usersApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
  pipelinesApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
  documentsApi: {
    getByLead: vi.fn().mockResolvedValue({ data: [] }),
    upload: vi.fn().mockResolvedValue({ data: {} }),
  },
  aiApi: {
    getSuggestions: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

vi.mock('@/services/intelligenceService', () => ({
  default: {
    getLeadPrediction: vi.fn().mockResolvedValue(null),
    getEngagementAnalysis: vi.fn().mockResolvedValue(null),
    getNextActions: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/components/ai/AIEmailComposer', () => ({ AIEmailComposer: () => <div /> }))
vi.mock('@/components/ai/AISMSComposer', () => ({ AISMSComposer: () => <div /> }))
vi.mock('@/components/ai/AISuggestedActions', () => ({ AISuggestedActions: () => <div /> }))
vi.mock('@/components/ai/PredictionBadge', () => ({ PredictionBadge: () => <div /> }))
vi.mock('@/components/activity/ActivityTimeline', () => ({ ActivityTimeline: () => <div /> }))
vi.mock('@/components/leads/CommunicationHistory', () => ({ CommunicationHistory: () => <div /> }))
vi.mock('@/components/leads/LeadTasks', () => ({ LeadTasks: () => <div /> }))
vi.mock('@/components/leads/FollowUpReminders', () => ({ FollowUpReminders: () => <div /> }))
vi.mock('@/components/leads/LogCallDialog', () => ({ LogCallDialog: () => <div /> }))

import LeadDetail from '@/pages/leads/LeadDetail'

describe('LeadDetail', () => {
  it('renders without crashing', () => {
    renderWithProviders(<LeadDetail />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
