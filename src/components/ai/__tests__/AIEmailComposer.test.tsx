import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/api', () => ({
  aiApi: { composeEmail: vi.fn().mockResolvedValue({ success: false }) },
  messagesApi: { send: vi.fn() },
}))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/hooks/useAIAvailability', () => ({
  getAIUnavailableMessage: vi.fn(() => null),
}))

import { AIEmailComposer } from '../AIEmailComposer'

describe('AIEmailComposer', () => {
  it('renders without crashing', () => {
    render(
      <AIEmailComposer
        isOpen={true}
        onClose={vi.fn()}
        leadName="John Doe"
        leadEmail="john@example.com"
      />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
