import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/api', () => ({
  settingsApi: {
    getGoogleIntegration: vi.fn().mockResolvedValue({ data: {} }),
    updateGoogleIntegration: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import GoogleIntegration from '@/pages/settings/GoogleIntegration'

describe('GoogleIntegration', () => {
  it('renders without crashing', () => {
    renderWithProviders(<GoogleIntegration />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
