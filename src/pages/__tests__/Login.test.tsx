import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    setAuth: vi.fn(),
    isLoading: false,
  }),
}))

vi.mock('@/lib/api', () => ({
  authApi: { login: vi.fn(), verify2FA: vi.fn() },
}))

import Login from '@/pages/auth/Login'

describe('Login', () => {
  it('renders welcome heading', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
  })

  it('renders email and password inputs', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('renders forgot password link', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
  })

  it('renders sign up link', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByText(/sign up/i)).toBeInTheDocument()
  })
})
