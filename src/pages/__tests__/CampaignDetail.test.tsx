/* eslint-disable @typescript-eslint/no-explicit-any */
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
    getCampaign: vi.fn().mockResolvedValue({ data: { campaign: { id: '1', name: 'Test', type: 'EMAIL', status: 'DRAFT', sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, converted: 0, revenue: 0, budget: 0, spent: 0 } } }),
    updateCampaign: vi.fn().mockResolvedValue({}),
    deleteCampaign: vi.fn().mockResolvedValue({}),
    duplicateCampaign: vi.fn().mockResolvedValue({}),
  },
  analyticsApi: {
    getCampaignAnalytics: vi.fn().mockResolvedValue({ data: {} }),
  },
  deliverabilityApi: {
    getCampaignDeliverability: vi.fn().mockResolvedValue({ data: {} }),
  },
}))
vi.mock('@/lib/metricsCalculator', () => ({
  calcRate: vi.fn(() => 0),
  calcOpenRate: vi.fn(() => 0),
  calcClickRate: vi.fn(() => 0),
  calcConversionRate: vi.fn(() => 0),
  calcUnsubscribeRate: vi.fn(() => 0),
  formatRate: vi.fn(() => '0%'),
  fmtMoney: vi.fn(() => '$0'),
}))
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('@/components/campaigns/CampaignExecutionStatus', () => ({
  CampaignExecutionStatus: () => <div />,
}))
vi.mock('dompurify', () => ({
  default: { sanitize: (s: string) => s },
}))

import CampaignDetail from '@/pages/campaigns/CampaignDetail'

describe('CampaignDetail', () => {
  it('renders without crashing', () => {
    renderWithProviders(<CampaignDetail />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
