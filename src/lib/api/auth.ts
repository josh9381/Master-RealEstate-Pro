import type { User } from '@/types'
import api from './client'

export interface RegisterData {
  firstName: string
  lastName: string
  email: string
  password: string
  tosAccepted: boolean
}

export interface LoginData {
  email: string
  password: string
  rememberMe?: boolean
  twoFactorCode?: string
}

export interface AuthResponse {
  success: boolean
  message: string
  data: {
    user: User
    tokens: {
      accessToken: string
      refreshToken: string
    }
  }
  // 2FA challenge fields (returned when user has 2FA enabled)
  requires2FA?: boolean
  pendingToken?: string
}

export const authApi = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data)
    return response.data
  },

  verify2FALogin: async (pendingToken: string, twoFactorCode: string, rememberMe?: boolean): Promise<AuthResponse> => {
    const response = await api.post('/auth/login/2fa-verify', { pendingToken, twoFactorCode, rememberMe })
    return response.data
  },

  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      await api.post('/auth/logout', { refreshToken })
    } catch {
      // Logout should succeed even if the API call fails
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await api.post('/auth/refresh', { refreshToken })
    return response.data
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me')
    // Backend returns { success: true, data: { user: { ... } } }
    const data = response.data
    if (data?.data?.user) {
      return data.data.user
    }
    // Fallback: maybe it's already the user object
    if (data?.user) {
      return data.user
    }
    return data
  },

  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }).then(r => r.data),

  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }).then(r => r.data),

  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }).then(r => r.data),

  resendVerification: () => api.post('/auth/resend-verification').then(r => r.data),

  getSessions: () => api.get('/auth/sessions').then(r => r.data?.data || r.data),

  terminateSession: (sessionId: string) => api.delete(`/auth/sessions/${sessionId}`).then(r => r.data),

  terminateAllSessions: () => api.post('/auth/sessions/terminate-all').then(r => r.data),

  deleteAccount: (password: string) => api.post('/auth/delete-account', { password }).then(r => r.data),
}
