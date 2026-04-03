import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    register: vi.fn(),
    isLoading: false,
  }),
}))

import Register from '@/pages/auth/Register'

describe('Register', () => {
  it('renders create account heading', () => {
    render(<MemoryRouter><Register /></MemoryRouter>)
    expect(screen.getAllByText('Create Account').length).toBeGreaterThanOrEqual(1)
  })

  it('renders email input', () => {
    render(<MemoryRouter><Register /></MemoryRouter>)
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
  })

  it('renders name inputs', () => {
    render(<MemoryRouter><Register /></MemoryRouter>)
    expect(screen.getByPlaceholderText('John')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Doe')).toBeInTheDocument()
  })
})
