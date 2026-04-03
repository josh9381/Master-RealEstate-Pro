import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  authApi: { forgotPassword: vi.fn() },
}))

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

import ForgotPassword from '@/pages/auth/ForgotPassword'

describe('ForgotPassword', () => {
  it('renders forgot password heading', () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>)
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
  })

  it('renders email input', () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>)
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
  })

  it('renders back to login link', () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>)
    expect(screen.getByText(/back to login/i)).toBeInTheDocument()
  })
})
