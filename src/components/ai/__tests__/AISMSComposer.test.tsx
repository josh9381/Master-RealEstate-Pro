import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/api', () => ({
  aiApi: { composeSMS: vi.fn().mockResolvedValue({ success: false }) },
  messagesApi: { send: vi.fn() },
}))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/hooks/useAIAvailability', () => ({
  getAIUnavailableMessage: vi.fn(() => null),
}))

import { AISMSComposer } from '../AISMSComposer'

describe('AISMSComposer', () => {
  it('renders without crashing', () => {
    render(
      <AISMSComposer
        isOpen={true}
        onClose={vi.fn()}
        leadName="Jane Doe"
        leadPhone="+15551234567"
      />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
