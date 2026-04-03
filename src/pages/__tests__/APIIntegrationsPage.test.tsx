import { renderWithProviders } from './test-utils'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

vi.mock('@/lib/appConfig', () => ({
  APP_API_BASE_URL: 'http://localhost:3000',
}))

import APIIntegrationsPage from '@/pages/integrations/APIIntegrationsPage'

describe('APIIntegrationsPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<APIIntegrationsPage />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
