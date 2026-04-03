import { renderWithProviders } from './test-utils'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  templatesApi: {
    getTemplates: vi.fn().mockResolvedValue({ data: [] }),
    createTemplate: vi.fn().mockResolvedValue({ data: {} }),
    updateTemplate: vi.fn().mockResolvedValue({ data: {} }),
    deleteTemplate: vi.fn().mockResolvedValue({ data: {} }),
  },
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

vi.mock('@/utils/smsSegments', () => ({
  calculateSMSSegments: () => ({ segments: 1, remaining: 160 }),
}))

import SMSTemplatesLibrary from '@/pages/communication/SMSTemplatesLibrary'

describe('SMSTemplatesLibrary', () => {
  it('renders without crashing', () => {
    renderWithProviders(<SMSTemplatesLibrary />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
