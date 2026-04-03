import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }))
vi.mock('@/services/aiService', () => ({
  enhanceMessage: vi.fn().mockResolvedValue({ data: { enhanced: 'enhanced text' } }),
}))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/hooks/useAIAvailability', () => ({
  getAIUnavailableMessage: vi.fn(() => null),
}))

import { MessageEnhancerModal } from '../MessageEnhancerModal'

describe('MessageEnhancerModal', () => {
  it('renders without crashing', () => {
    render(
      <MessageEnhancerModal
        isOpen={true}
        onClose={vi.fn()}
        originalText="Hello world"
        onApply={vi.fn()}
      />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
