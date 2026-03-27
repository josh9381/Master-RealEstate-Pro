import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RequireRole, RequireAdmin } from '../RequireRole'
import { useAuthStore } from '@/store/authStore'

vi.mock('@/store/authStore')

const mockUseAuthStore = vi.mocked(useAuthStore)

function renderWithRouter(ui: React.ReactElement, initialPath = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/auth/login" element={<div>Login Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/custom-fallback" element={<div>Custom Fallback</div>} />
        <Route path="/protected" element={ui} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /auth/login when user is null', () => {
    mockUseAuthStore.mockReturnValue(null as any)
    renderWithRouter(
      <RequireRole roles={['ADMIN']}>
        <div>Admin Page</div>
      </RequireRole>
    )
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Admin Page')).not.toBeInTheDocument()
  })

  it('redirects to /dashboard when user has wrong role', () => {
    mockUseAuthStore.mockReturnValue({ role: 'USER' } as any)
    renderWithRouter(
      <RequireRole roles={['ADMIN']}>
        <div>Admin Page</div>
      </RequireRole>
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Admin Page')).not.toBeInTheDocument()
  })

  it('renders children when user has the required role (ADMIN)', () => {
    mockUseAuthStore.mockReturnValue({ role: 'ADMIN' } as any)
    renderWithRouter(
      <RequireRole roles={['ADMIN', 'admin']}>
        <div>Admin Page</div>
      </RequireRole>
    )
    expect(screen.getByText('Admin Page')).toBeInTheDocument()
  })

  it('renders children when user has the required role (MANAGER)', () => {
    mockUseAuthStore.mockReturnValue({ role: 'MANAGER' } as any)
    renderWithRouter(
      <RequireRole roles={['ADMIN', 'MANAGER']}>
        <div>Manager Page</div>
      </RequireRole>
    )
    expect(screen.getByText('Manager Page')).toBeInTheDocument()
  })

  it('redirects to custom fallback when provided', () => {
    mockUseAuthStore.mockReturnValue({ role: 'USER' } as any)
    renderWithRouter(
      <RequireRole roles={['ADMIN']} fallback="/custom-fallback">
        <div>Admin Page</div>
      </RequireRole>
    )
    expect(screen.getByText('Custom Fallback')).toBeInTheDocument()
  })
})

describe('RequireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children for ADMIN role', () => {
    mockUseAuthStore.mockReturnValue({ role: 'ADMIN' } as any)
    renderWithRouter(
      <RequireAdmin>
        <div>Admin Only</div>
      </RequireAdmin>
    )
    expect(screen.getByText('Admin Only')).toBeInTheDocument()
  })

  it('redirects for non-admin role', () => {
    mockUseAuthStore.mockReturnValue({ role: 'USER' } as any)
    renderWithRouter(
      <RequireAdmin>
        <div>Admin Only</div>
      </RequireAdmin>
    )
    expect(screen.queryByText('Admin Only')).not.toBeInTheDocument()
  })
})
