import { renderWithProviders } from './test-utils'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

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

vi.mock('dompurify', () => ({
  default: { sanitize: (x: string) => x },
}))

vi.mock('@/components/email/EmailBlockEditor', () => ({
  EmailBlockEditor: () => <div>EmailBlockEditor</div>,
}))

import EmailTemplatesLibrary from '@/pages/communication/EmailTemplatesLibrary'

describe('EmailTemplatesLibrary', () => {
  it('renders without crashing', () => {
    renderWithProviders(<EmailTemplatesLibrary />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
