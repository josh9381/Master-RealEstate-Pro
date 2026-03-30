import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PredictionBadge } from '../PredictionBadge'

describe('PredictionBadge', () => {
  it('renders probability badge with high value', () => {
    render(<PredictionBadge type="probability" value={85} />)
    expect(screen.getByText(/85/)).toBeInTheDocument()
  })

  it('renders probability badge with low value', () => {
    render(<PredictionBadge type="probability" value={20} />)
    expect(screen.getByText(/20/)).toBeInTheDocument()
  })

  it('renders value badge with dollar amount', () => {
    render(<PredictionBadge type="value" value={25000} />)
    expect(screen.getByText(/25/)).toBeInTheDocument()
  })

  it('renders risk badge', () => {
    render(<PredictionBadge type="risk" value={75} />)
    expect(screen.getByText(/75/)).toBeInTheDocument()
  })

  it('renders N/A for null value', () => {
    render(<PredictionBadge type="probability" value={null as any} />)
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('renders with custom label', () => {
    render(<PredictionBadge type="probability" value={50} label="Conversion" />)
    expect(screen.getByText(/Conversion/)).toBeInTheDocument()
  })

  it('renders without icon when showIcon is false', () => {
    render(<PredictionBadge type="probability" value={50} showIcon={false} />)
    expect(screen.getByText(/50/)).toBeInTheDocument()
  })

  it('renders in different sizes', () => {
    const { rerender } = render(<PredictionBadge type="probability" value={50} size="sm" />)
    expect(screen.getByText(/50/)).toBeInTheDocument()
    rerender(<PredictionBadge type="probability" value={50} size="lg" />)
    expect(screen.getByText(/50/)).toBeInTheDocument()
  })
})
