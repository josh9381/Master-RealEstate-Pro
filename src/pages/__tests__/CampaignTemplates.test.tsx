import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/api', () => {
  const api = { get: vi.fn().mockResolvedValue({ data: { data: [] } }), post: vi.fn().mockResolvedValue({ data: {} }), put: vi.fn().mockResolvedValue({ data: {} }), delete: vi.fn().mockResolvedValue({}) }
  return {
    default: api,
    campaignsApi: {
      getCampaigns: vi.fn().mockResolvedValue({ data: { campaigns: [] } }),
      createCampaign: vi.fn().mockResolvedValue({}),
    },
  }
})
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/components/email/EmailBlockEditor', () => ({
  EmailBlockEditor: () => <div data-testid="email-block-editor" />,
}))

import CampaignTemplates from '@/pages/campaigns/CampaignTemplates'

describe('CampaignTemplates', () => {
  it('renders without crashing', () => {
    renderWithProviders(<CampaignTemplates />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
