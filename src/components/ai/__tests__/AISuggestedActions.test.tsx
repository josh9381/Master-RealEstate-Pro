import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }))
vi.mock('@/lib/api', () => ({
  aiApi: { getSuggestedActions: vi.fn().mockResolvedValue({ success: true, data: [] }) },
}))
vi.mock('@/hooks/useAIAvailability', () => ({
  getAIUnavailableMessage: vi.fn(() => null),
}))
vi.mock('@/lib/metricsCalculator', () => ({
  formatRate: (v: number) => `${v}%`,
}))

import { AISuggestedActions } from '../AISuggestedActions'

describe('AISuggestedActions', () => {
  it('renders without crashing', () => {
    render(<AISuggestedActions />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
