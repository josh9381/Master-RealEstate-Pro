import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '@/store/authStore'

// Mock the modules the auth store depends on
vi.mock('@/lib/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}))
vi.mock('@/hooks/useSocket', () => ({
  disconnectSocket: vi.fn(),
}))
vi.mock('@/lib/userStorage', () => ({
  clearUserStorage: vi.fn(),
}))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'ADMIN' as const,
  organization: {
    id: 'org-1',
    name: 'Test Org',
    subscriptionTier: 'PROFESSIONAL' as const,
    memberCount: 3,
    trialEndsAt: null,
  },
  permissions: {
    canManageLeads: true,
    canManageCampaigns: true,
    canManageTeam: false,
    canViewAnalytics: true,
    canManageSettings: true,
    canManageBilling: false,
    canManageIntegrations: false,
    canManageWorkflows: true,
  },
}

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('setAuth', () => {
    it('sets user, tokens, and isAuthenticated', () => {
      const store = useAuthStore.getState()
      store.setAuth(mockUser as any, 'access-token', 'refresh-token')

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.accessToken).toBe('access-token')
      expect(state.refreshToken).toBe('refresh-token')
      expect(state.isAuthenticated).toBe(true)
      expect(state.error).toBeNull()
    })

    it('stores tokens in localStorage', () => {
      const store = useAuthStore.getState()
      store.setAuth(mockUser as any, 'access-token', 'refresh-token')

      expect(localStorage.getItem('accessToken')).toBe('access-token')
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token')
    })
  })

  describe('clearAuth', () => {
    it('clears all auth state', () => {
      const store = useAuthStore.getState()
      store.setAuth(mockUser as any, 'access-token', 'refresh-token')
      store.clearAuth()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.accessToken).toBeNull()
      expect(state.refreshToken).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })

    it('removes tokens from localStorage', () => {
      localStorage.setItem('accessToken', 'token')
      localStorage.setItem('refreshToken', 'token')

      const store = useAuthStore.getState()
      store.clearAuth()

      expect(localStorage.getItem('accessToken')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
    })
  })

  describe('login', () => {
    it('calls authApi.login and sets auth on success', async () => {
      const { authApi } = await import('@/lib/api')
      ;(authApi.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          user: mockUser,
          tokens: { accessToken: 'new-access', refreshToken: 'new-refresh' },
        },
      })

      const store = useAuthStore.getState()
      await store.login({ email: 'test@example.com', password: 'pass' })

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(mockUser)
      expect(state.isLoading).toBe(false)
    })

    it('sets error on login failure', async () => {
      const { authApi } = await import('@/lib/api')
      ;(authApi.login as ReturnType<typeof vi.fn>).mockRejectedValue({
        response: { data: { message: 'Invalid credentials' } },
      })

      const store = useAuthStore.getState()
      await expect(store.login({ email: 'bad@email.com', password: 'wrong' }))
        .rejects.toBeTruthy()

      const state = useAuthStore.getState()
      expect(state.error).toBe('Invalid credentials')
      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('helper getters', () => {
    it('isAdmin returns true for ADMIN role', () => {
      useAuthStore.setState({ user: mockUser as any })
      expect(useAuthStore.getState().isAdmin()).toBe(true)
    })

    it('isAdmin returns false for non-admin', () => {
      useAuthStore.setState({ user: { ...mockUser, role: 'USER' } as any })
      expect(useAuthStore.getState().isAdmin()).toBe(false)
    })

    it('isTeamMode returns true when memberCount > 1', () => {
      useAuthStore.setState({ user: mockUser as any })
      expect(useAuthStore.getState().isTeamMode()).toBe(true)
    })

    it('getSubscriptionTier returns the org tier', () => {
      useAuthStore.setState({ user: mockUser as any })
      expect(useAuthStore.getState().getSubscriptionTier()).toBe('PROFESSIONAL')
    })

    it('isTrialActive returns false when no trial date', () => {
      useAuthStore.setState({ user: mockUser as any })
      expect(useAuthStore.getState().isTrialActive()).toBe(false)
    })

    it('isTrialActive returns true for future trial date', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString()
      useAuthStore.setState({
        user: {
          ...mockUser,
          organization: { ...mockUser.organization, trialEndsAt: futureDate },
        } as any,
      })
      expect(useAuthStore.getState().isTrialActive()).toBe(true)
    })
  })
})
