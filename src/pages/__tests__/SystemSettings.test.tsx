import { renderWithProviders } from './test-utils'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  adminApi: {
    getSystemSettings: vi.fn().mockResolvedValue({ data: {} }),
    updateSystemSettings: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

vi.mock('@/lib/appConfig', () => ({
  APP_NAME: 'TestApp',
}))

import SystemSettings from '@/pages/admin/SystemSettings'

describe('SystemSettings', () => {
  it('renders without crashing', () => {
    renderWithProviders(<SystemSettings />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
