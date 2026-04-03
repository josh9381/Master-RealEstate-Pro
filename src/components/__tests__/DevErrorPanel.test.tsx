import { render, screen } from '@testing-library/react'
import { DevErrorPanel } from '@/components/DevErrorPanel'

vi.mock('@/lib/devErrorMonitor', () => ({
  getDevErrors: () => [
    { message: 'Test error', count: 2, firstSeen: Date.now(), lastSeen: Date.now(), stack: '' },
  ],
  clearDevErrors: vi.fn(),
}))

describe('DevErrorPanel', () => {
  it('renders error badge in dev mode', () => {
    render(<DevErrorPanel />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('errors')).toBeInTheDocument()
  })
})
