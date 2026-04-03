import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotFound from '@/pages/NotFound'

describe('NotFound', () => {
  it('renders 404 heading', () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('renders page not found message', () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>)
    expect(screen.getByText('Page Not Found')).toBeInTheDocument()
  })

  it('renders Go Home link', () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>)
    expect(screen.getByText('Go Home')).toBeInTheDocument()
  })
})
