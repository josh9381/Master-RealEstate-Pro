import axios, { AxiosError } from 'axios'
import { devApiSuccessInterceptor, devApiErrorInterceptor } from '../devErrorMonitor'

// Determine the API base URL
export const getApiBaseUrl = () => {
  // Check if we have an environment variable for the API URL
  const envApiUrl = import.meta.env.VITE_API_URL
  if (envApiUrl) {
    return envApiUrl
  }

  // In GitHub Codespaces, detect the backend URL
  if (window.location.hostname.includes('app.github.dev')) {
    // Replace the port 3000 with 8000 for backend
    const backendUrl = window.location.origin.replace('-3000.', '-8000.')
    const apiUrl = `${backendUrl}/api`
    return apiUrl
  }

  // Default to relative path (works with Vite proxy in local development)
  return '/api'
}

// Create axios instance
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle token refresh
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => devApiSuccessInterceptor(response),
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return api(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refreshToken')

      if (!refreshToken) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('auth-storage')
        window.location.href = '/auth/login'
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${getApiBaseUrl()}/auth/refresh`, { refreshToken })
        // Handle both token structures: {data: {accessToken}} and {data: {tokens: {accessToken}}}
        const data = response.data.data || response.data
        const newAccessToken = data.tokens?.accessToken || data.accessToken
        // Token rotation (#87): backend now returns a new refresh token
        const newRefreshToken = data.tokens?.refreshToken || data.refreshToken

        if (!newAccessToken) {
          throw new Error('No access token in refresh response')
        }

        localStorage.setItem('accessToken', newAccessToken)
        // Store rotated refresh token if provided
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken)
        }
        processQueue(null, newAccessToken)

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        }
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as Error, null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('auth-storage')
        window.location.href = '/auth/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Surface API error messages so .message contains the server's message
    const serverMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message
    if (serverMessage && typeof serverMessage === 'string') {
      error.message = serverMessage
    }

    return devApiErrorInterceptor(error)
  }
)

export default api
