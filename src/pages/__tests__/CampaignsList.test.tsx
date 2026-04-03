/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/lib/api', () => ({
  campaignsApi: {
    list: vi.fn().mockResolvedValue({ data: { campaigns: [], total: 0, totalPages: 0 } }),
    getStats: vi.fn().mockResolvedValue({ data: { total: 0, active: 0, draft: 0, completed: 0 } }),
    delete: vi.fn(),
    duplicate: vi.fn(),
  },
  CampaignsQuery: {},
}))
vi.mock('@/lib/campaignUtils', () => ({
  getStatusVariant: vi.fn(() => 'default'),
}))
vi.mock('@/lib/exportService', () => ({
  exportToCSV: vi.fn(),
  campaignExportColumns: [],
}))
vi.mock('@/components/subscription/FeatureGate', () => ({
  FeatureGate: ({ children }: any) => <div>{children}</div>,
  UsageBadge: () => <div />,
}))
vi.mock('@/components/campaigns/CampaignRowMenu', () => ({
  CampaignRowMenu: () => <div />,
}))
vi.mock('@/components/bulk/BulkActionsBar', () => ({
  BulkActionsBar: () => <div />,
}))
vi.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Legend: () => <div />,
}))

import CampaignsList from '@/pages/campaigns/CampaignsList'

describe('CampaignsList', () => {
  it('renders without crashing', () => {
    renderWithProviders(<CampaignsList />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
