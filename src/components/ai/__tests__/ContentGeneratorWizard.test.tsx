import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/hooks/useAIAvailability', () => ({
  getAIUnavailableMessage: vi.fn(() => null),
}))
vi.mock('@/store/authStore', () => {
  const store = Object.assign(() => 'fake-token', {
    getState: () => ({ accessToken: 'fake-token', user: { id: '1', role: 'admin' } }),
    subscribe: vi.fn(() => vi.fn()),
  })
  return { useAuthStore: store }
})

import { ContentGeneratorWizard } from '../ContentGeneratorWizard'

describe('ContentGeneratorWizard', () => {
  it('renders without crashing', () => {
    render(
      <ContentGeneratorWizard
        isOpen={true}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
