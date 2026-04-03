import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  messagesApi: {
    getMessages: vi.fn().mockResolvedValue({ data: { threads: [] } }),
  },
}))

vi.mock('@/lib/metricsCalculator', () => ({
  formatRate: (v: number) => `${v}%`,
}))

import NewsletterManagement from '@/pages/communication/NewsletterManagement'

describe('NewsletterManagement', () => {
  it('renders without crashing', () => {
    renderWithProviders(<NewsletterManagement />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
