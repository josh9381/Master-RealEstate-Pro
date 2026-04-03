import { renderWithProviders } from './test-utils'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useParams: () => ({ id: '1' }), useNavigate: () => vi.fn() }
})
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/lib/api', () => ({
  campaignsApi: {
    getCampaign: vi.fn().mockResolvedValue({ data: { campaign: { id: '1', name: 'Test', type: 'EMAIL', status: 'DRAFT', subject: '', body: '', previewText: '', startDate: '', endDate: '', budget: 0, spent: 0 } } }),
    updateCampaign: vi.fn().mockResolvedValue({}),
  },
}))
vi.mock('@/components/email/EmailBlockEditor', () => ({
  EmailBlockEditor: () => <div data-testid="email-block-editor" />,
}))

import CampaignEdit from '@/pages/campaigns/CampaignEdit'

describe('CampaignEdit', () => {
  it('renders without crashing', () => {
    renderWithProviders(<CampaignEdit />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
