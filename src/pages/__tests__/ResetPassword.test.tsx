import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  authApi: { resetPassword: vi.fn() },
}))

import ResetPassword from '@/pages/auth/ResetPassword'

describe('ResetPassword', () => {
  it('renders reset password heading', () => {
    render(<MemoryRouter initialEntries={['?token=abc123']}><ResetPassword /></MemoryRouter>)
    expect(screen.getAllByText('Reset Password').length).toBeGreaterThanOrEqual(1)
  })

  it('renders password inputs', () => {
    render(<MemoryRouter initialEntries={['?token=abc123']}><ResetPassword /></MemoryRouter>)
    expect(screen.getByPlaceholderText('Enter new password')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Confirm new password')).toBeInTheDocument()
  })
})
