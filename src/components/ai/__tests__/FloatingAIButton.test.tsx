import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

// Must be set before any component import
window.HTMLElement.prototype.scrollIntoView = vi.fn()

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/api', () => ({
  aiApi: { submitFeedback: vi.fn() },
}))
vi.mock('@/services/aiService', () => ({
  sendChatMessage: vi.fn(),
  getChatHistory: vi.fn().mockResolvedValue({ data: [] }),
}))
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/hooks/useAIAvailability', () => ({
  getAIUnavailableMessage: vi.fn(() => null),
}))
vi.mock('@/lib/metricsCalculator', () => ({
  formatRate: (v: number) => `${v}%`,
}))

import { FloatingAIButton } from '../FloatingAIButton'

describe('FloatingAIButton', () => {
  it('renders without crashing', () => {
    render(<MemoryRouter><FloatingAIButton /></MemoryRouter>)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
