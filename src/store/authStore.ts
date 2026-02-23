import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserPermissions } from '@/types'
import { authApi, type LoginData, type RegisterData } from '@/lib/api'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (data: LoginData) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  fetchCurrentUser: () => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Helper getters
  isAdmin: () => boolean
  isManager: () => boolean
  isTeamMode: () => boolean
  hasPermission: (permission: keyof UserPermissions) => boolean
  getSubscriptionTier: () => 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | null
  isTrialActive: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        set({ 
          user, 
          accessToken, 
          refreshToken, 
          isAuthenticated: true,
          error: null 
        })
      },

      clearAuth: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({ 
          user: null, 
          accessToken: null, 
          refreshToken: null, 
          isAuthenticated: false,
          error: null 
        })
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      setError: (error) => {
        set({ error })
      },

      login: async (data: LoginData) => {
        try {
          set({ isLoading: true, error: null })
          const response = await authApi.login(data)
          const responseData = response.data || response
          get().setAuth(responseData.user, responseData.tokens?.accessToken, responseData.tokens?.refreshToken)
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } }
          const errorMessage = err.response?.data?.message || 'Login failed'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      register: async (data: RegisterData) => {
        try {
          set({ isLoading: true, error: null })
          const response = await authApi.register(data)
          const responseData = response.data || response
          get().setAuth(responseData.user, responseData.tokens?.accessToken, responseData.tokens?.refreshToken)
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } }
          const errorMessage = err.response?.data?.message || 'Registration failed'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true })
          await authApi.logout()
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          get().clearAuth()
          set({ isLoading: false })
        }
      },

      fetchCurrentUser: async () => {
        try {
          set({ isLoading: true, error: null })
          const user = await authApi.getCurrentUser()
          set({ user, isAuthenticated: true })
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } }
          const errorMessage = err.response?.data?.message || 'Failed to fetch user'
          set({ error: errorMessage })
          get().clearAuth()
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      
      // Helper getters
      isAdmin: () => {
        const state = get()
        return state.user?.role === 'ADMIN' || state.user?.role === 'admin'
      },
      
      isManager: () => {
        const state = get()
        return state.user?.role === 'MANAGER' || state.user?.role === 'manager'
      },
      
      isTeamMode: () => {
        const state = get()
        return (state.user?.organization?.memberCount ?? 1) > 1
      },
      
      hasPermission: (permission: keyof UserPermissions) => {
        const state = get()
        return state.user?.permissions?.[permission] ?? false
      },
      
      getSubscriptionTier: () => {
        const state = get()
        return state.user?.organization?.subscriptionTier ?? null
      },
      
      isTrialActive: () => {
        const state = get()
        const trialEndsAt = state.user?.organization?.trialEndsAt
        if (!trialEndsAt) return false
        return new Date(trialEndsAt) > new Date()
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
