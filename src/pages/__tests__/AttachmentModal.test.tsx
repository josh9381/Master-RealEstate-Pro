import { renderWithProviders } from './test-utils'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  messagesApi: {
    uploadAttachment: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { AttachmentModal } from '@/pages/communication/inbox/AttachmentModal'

describe('AttachmentModal', () => {
  it('renders without crashing', () => {
    renderWithProviders(
      <AttachmentModal onClose={vi.fn()} onFilesAdded={vi.fn()} />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
