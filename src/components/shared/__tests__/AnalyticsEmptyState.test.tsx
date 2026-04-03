import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AnalyticsEmptyState } from '@/components/shared/AnalyticsEmptyState'

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('AnalyticsEmptyState', () => {
  it('renders default message for general variant', () => {
    renderWithRouter(<AnalyticsEmptyState variant="general" />)
    expect(screen.getByText('No analytics data yet')).toBeInTheDocument()
  })

  it('renders leads variant', () => {
    renderWithRouter(<AnalyticsEmptyState variant="leads" />)
    expect(screen.getByText('No lead data yet')).toBeInTheDocument()
  })

  it('renders custom title when provided', () => {
    renderWithRouter(<AnalyticsEmptyState variant="general" title="Custom Title" />)
    expect(screen.getByText('Custom Title')).toBeInTheDocument()
  })

  it('renders action buttons', () => {
    renderWithRouter(<AnalyticsEmptyState variant="campaigns" />)
    expect(screen.getByRole('button', { name: /Create a Campaign/i })).toBeInTheDocument()
  })
})
