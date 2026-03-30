import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScoreBadge } from '../ScoreBadge'

describe('ScoreBadge', () => {
  it('renders Hot badge for score >= 80', () => {
    render(<ScoreBadge score={90} />)
    expect(screen.getByText('Hot')).toBeInTheDocument()
  })

  it('renders Warm badge for score >= 50', () => {
    render(<ScoreBadge score={60} />)
    expect(screen.getByText('Warm')).toBeInTheDocument()
  })

  it('renders Cool badge for score >= 25', () => {
    render(<ScoreBadge score={30} />)
    expect(screen.getByText('Cool')).toBeInTheDocument()
  })

  it('renders Cold badge for score < 25', () => {
    render(<ScoreBadge score={10} />)
    expect(screen.getByText('Cold')).toBeInTheDocument()
  })

  it('shows score value when showValue is true', () => {
    render(<ScoreBadge score={85} showValue />)
    expect(screen.getByText(/85/)).toBeInTheDocument()
  })

  it('renders without icon when showIcon is false', () => {
    render(<ScoreBadge score={50} showIcon={false} />)
    expect(screen.getByText('Warm')).toBeInTheDocument()
  })
})
