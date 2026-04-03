import { renderWithProviders } from './test-utils'

vi.mock('@/lib/api', () => ({
  adminApi: {
    getAuditLogs: vi.fn().mockResolvedValue({ data: { logs: [], total: 0, page: 1, limit: 25, totalPages: 0 } }),
  },
}))

import AuditTrail from '@/pages/admin/AuditTrail'

describe('AuditTrail', () => {
  it('renders without crashing', () => {
    renderWithProviders(<AuditTrail />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
