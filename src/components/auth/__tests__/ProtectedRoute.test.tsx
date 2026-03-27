import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute'
import { useAuthStore } from '@/store/authStore'
import { useSessionManager } from '@/hooks/useSessionManager'

vi.mock('@/store/authStore')
vi.mock('@/hooks/useSessionManager')

const mockUseAuthStore = vi.mocked(useAuthStore)
const mockUseSessionManager = vi.mocked(useSessionManager)

function renderWithRouter(ui: React.ReactElement, initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/auth/login" element={<div>Login Page</div>} />
        <Route path="*" element={ui} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSessionManager.mockReturnValue(undefined as any)
  })

  it('renders children when authenticated', async () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      accessToken: 'tok',
      fetchCurrentUser: vi.fn(),
    } as any)
    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  it('redirects to /auth/login when not authenticated and no token', async () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      accessToken: null,
      fetchCurrentUser: vi.fn(),
    } as any)
    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('shows loading spinner while checking authentication', () => {
    // Mock fetchCurrentUser to never resolve (stays loading)
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      accessToken: 'token',
      fetchCurrentUser: () => new Promise(() => {}),
    } as any)
    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('calls fetchCurrentUser when token exists but not authenticated', async () => {
    const fetchCurrentUser = vi.fn().mockResolvedValue(undefined)
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      accessToken: 'token',
      fetchCurrentUser,
    } as any)
    renderWithRouter(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>
    )
    await waitFor(() => {
      expect(fetchCurrentUser).toHaveBeenCalled()
    })
  })

  it('calls useSessionManager hook on render', async () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      accessToken: 'tok',
      fetchCurrentUser: vi.fn(),
    } as any)
    renderWithRouter(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>
    )
    expect(mockUseSessionManager).toHaveBeenCalled()
  })
})
