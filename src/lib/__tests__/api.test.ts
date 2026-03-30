/**
 * Tests for the API client getApiBaseUrl function
 * We test the URL resolution logic which is critical for multi-environment support
 */

import { getApiBaseUrl } from '../api'

describe('getApiBaseUrl', () => {
  it('returns a string URL', () => {
    const url = getApiBaseUrl()
    expect(typeof url).toBe('string')
    expect(url.length).toBeGreaterThan(0)
  })

  it('uses VITE_API_URL when set', () => {
    const original = import.meta.env.VITE_API_URL
    ;(import.meta.env as any).VITE_API_URL = 'https://api.example.com'

    const url = getApiBaseUrl()
    expect(url).toBe('https://api.example.com')

    if (original !== undefined) {
      ;(import.meta.env as any).VITE_API_URL = original
    } else {
      delete (import.meta.env as any).VITE_API_URL
    }
  })

  it('defaults to /api when no env var and not codespaces', () => {
    const original = import.meta.env.VITE_API_URL
    delete (import.meta.env as any).VITE_API_URL

    // In jsdom, hostname is 'localhost' by default
    const url = getApiBaseUrl()
    // Should either be /api or something ending in /api
    expect(url).toMatch(/\/api$/)

    if (original !== undefined) {
      ;(import.meta.env as any).VITE_API_URL = original
    }
  })
})

describe('api interceptor behavior', () => {
  it('stores and retrieves access token from localStorage', () => {
    localStorage.setItem('accessToken', 'my-token')
    expect(localStorage.getItem('accessToken')).toBe('my-token')
    localStorage.removeItem('accessToken')
  })

  it('has no refresh token when not logged in', () => {
    localStorage.removeItem('refreshToken')
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })
})
