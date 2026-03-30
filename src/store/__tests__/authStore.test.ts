import { useAuthStore } from '@/store/authStore'
import { act } from '@testing-library/react'
import { createMockUser, createMockOrganization } from '@/test/helpers/factories'

// Mock external dependencies
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
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

describe('authStore', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().clearAuth()
    })
    localStorage.clear()
  })

  describe('setAuth', () => {
    it('sets user, tokens, and isAuthenticated', () => {
      const user = createMockUser()
      act(() => {
        useAuthStore.getState().setAuth(user, 'access-token', 'refresh-token')
      })
      const state = useAuthStore.getState()
      expect(state.user).toEqual(user)
      expect(state.accessToken).toBe('access-token')
      expect(state.refreshToken).toBe('refresh-token')
      expect(state.isAuthenticated).toBe(true)
      expect(localStorage.getItem('accessToken')).toBe('access-token')
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token')
    })
  })

  describe('clearAuth', () => {
    it('clears all auth state and localStorage', () => {
      const user = createMockUser()
      act(() => {
        useAuthStore.getState().setAuth(user, 'at', 'rt')
        useAuthStore.getState().clearAuth()
      })
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.accessToken).toBeNull()
      expect(localStorage.getItem('accessToken')).toBeNull()
    })
  })

  describe('isAdmin', () => {
    it('returns true for ADMIN role', () => {
      act(() => {
        useAuthStore.getState().setAuth(createMockUser({ role: 'ADMIN' }), 'at', 'rt')
      })
      expect(useAuthStore.getState().isAdmin()).toBe(true)
    })

    it('returns true for lowercase admin role', () => {
      act(() => {
        useAuthStore.getState().setAuth(createMockUser({ role: 'admin' }), 'at', 'rt')
      })
      expect(useAuthStore.getState().isAdmin()).toBe(true)
    })

    it('returns false for USER role', () => {
      act(() => {
        useAuthStore.getState().setAuth(createMockUser({ role: 'USER' }), 'at', 'rt')
      })
      expect(useAuthStore.getState().isAdmin()).toBe(false)
    })
  })

  describe('isManager', () => {
    it('returns true for MANAGER role', () => {
      act(() => {
        useAuthStore.getState().setAuth(createMockUser({ role: 'MANAGER' }), 'at', 'rt')
      })
      expect(useAuthStore.getState().isManager()).toBe(true)
    })

    it('returns false for USER role', () => {
      act(() => {
        useAuthStore.getState().setAuth(createMockUser({ role: 'USER' }), 'at', 'rt')
      })
      expect(useAuthStore.getState().isManager()).toBe(false)
    })
  })

  describe('isTeamMode', () => {
    it('returns true when org has multiple members', () => {
      act(() => {
        useAuthStore.getState().setAuth(
          createMockUser({ organization: createMockOrganization({ memberCount: 5 }) }),
          'at', 'rt'
        )
      })
      expect(useAuthStore.getState().isTeamMode()).toBe(true)
    })

    it('returns false when org has 1 member', () => {
      act(() => {
        useAuthStore.getState().setAuth(
          createMockUser({ organization: createMockOrganization({ memberCount: 1 }) }),
          'at', 'rt'
        )
      })
      expect(useAuthStore.getState().isTeamMode()).toBe(false)
    })
  })

  describe('hasPermission', () => {
    it('returns true for granted permission', () => {
      act(() => {
        useAuthStore.getState().setAuth(createMockUser(), 'at', 'rt')
      })
      expect(useAuthStore.getState().hasPermission('canManageLeads')).toBe(true)
    })

    it('returns false for denied permission', () => {
      act(() => {
        useAuthStore.getState().setAuth(createMockUser(), 'at', 'rt')
      })
      expect(useAuthStore.getState().hasPermission('canManageSystem')).toBe(false)
    })
  })

  describe('getSubscriptionTier', () => {
    it('returns org subscription tier', () => {
      act(() => {
        useAuthStore.getState().setAuth(
          createMockUser({ organization: createMockOrganization({ subscriptionTier: 'ELITE' }) }),
          'at', 'rt'
        )
      })
      expect(useAuthStore.getState().getSubscriptionTier()).toBe('ELITE')
    })

    it('returns null when no org', () => {
      act(() => {
        useAuthStore.getState().setAuth(createMockUser({ organization: undefined }), 'at', 'rt')
      })
      expect(useAuthStore.getState().getSubscriptionTier()).toBeNull()
    })
  })

  describe('isTrialActive', () => {
    it('returns true when trial end is in the future', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString()
      act(() => {
        useAuthStore.getState().setAuth(
          createMockUser({ organization: createMockOrganization({ trialEndsAt: futureDate }) }),
          'at', 'rt'
        )
      })
      expect(useAuthStore.getState().isTrialActive()).toBe(true)
    })

    it('returns false when trial end is in the past', () => {
      const pastDate = new Date('2020-01-01').toISOString()
      act(() => {
        useAuthStore.getState().setAuth(
          createMockUser({ organization: createMockOrganization({ trialEndsAt: pastDate }) }),
          'at', 'rt'
        )
      })
      expect(useAuthStore.getState().isTrialActive()).toBe(false)
    })

    it('returns false when no trial date', () => {
      act(() => {
        useAuthStore.getState().setAuth(createMockUser(), 'at', 'rt')
      })
      expect(useAuthStore.getState().isTrialActive()).toBe(false)
    })
  })

  describe('setLoading/setError', () => {
    it('sets loading state', () => {
      act(() => { useAuthStore.getState().setLoading(true) })
      expect(useAuthStore.getState().isLoading).toBe(true)
    })

    it('sets error state', () => {
      act(() => { useAuthStore.getState().setError('Something failed') })
      expect(useAuthStore.getState().error).toBe('Something failed')
    })
  })
})
