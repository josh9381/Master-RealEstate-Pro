import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/api', () => ({
  campaignsApi: {
    getCampaigns: vi.fn().mockResolvedValue({ data: { campaigns: [] } }),
    updateCampaign: vi.fn().mockResolvedValue({}),
  },
}))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/lib/metricsCalculator', () => ({
  formatRate: vi.fn(() => '0%'),
  calcRate: vi.fn(() => 0),
}))

import CampaignSchedule from '@/pages/campaigns/CampaignSchedule'

describe('CampaignSchedule', () => {
  it('renders without crashing', () => {
    renderWithProviders(<CampaignSchedule />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
