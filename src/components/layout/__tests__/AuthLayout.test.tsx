import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'

describe('AuthLayout', () => {
  it('renders brand title', () => {
    render(
      <MemoryRouter>
        <AuthLayout />
      </MemoryRouter>
    )
    expect(screen.getByText('Pro')).toBeInTheDocument()
  })

  it('renders tagline', () => {
    render(
      <MemoryRouter>
        <AuthLayout />
      </MemoryRouter>
    )
    expect(screen.getByText('CRM & Marketing Automation for Real Estate')).toBeInTheDocument()
  })

  it('renders full-screen container with center alignment', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthLayout />
      </MemoryRouter>
    )
    expect(container.querySelector('.min-h-screen')).toBeTruthy()
    expect(container.querySelector('.items-center')).toBeTruthy()
  })
})
