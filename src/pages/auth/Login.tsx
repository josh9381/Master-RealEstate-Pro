import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/lib/api'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const { setAuth, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Cleanup ref for navigation timeouts
  const navTimerRef = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => { clearTimeout(navTimerRef.current) }, [])

  // Determine where to redirect after login:
  // 1. React Router state.from (set by ProtectedRoute)
  // 2. ?returnTo= query param (set by idle session manager)
  // 3. Fallback to dashboard
  const getReturnPath = () => {
    const stateFrom = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from
    if (stateFrom?.pathname) return stateFrom.pathname + (stateFrom.search || '')
    const returnTo = searchParams.get('returnTo')
    if (returnTo) {
      try {
        const decoded = decodeURIComponent(returnTo)
        // Only allow relative paths to prevent open redirect
        if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded
      } catch { /* ignore */ }
    }
    return '/'
  }

  // 2FA challenge state
  const [requires2FA, setRequires2FA] = useState(false)
  const [pendingToken, setPendingToken] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')

  // Show idle-timeout message if redirected from session manager
  useEffect(() => {
    if (searchParams.get('reason') === 'idle') {
      toast.warning('Session expired', 'You were logged out due to inactivity. Please sign in again.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Missing fields', 'Please enter both email and password')
      return
    }
    
    setLoading(true)
    try {
      const response = await authApi.login({ email, password, rememberMe })
      
      // Check if 2FA is required (response shape differs: no nested data.user)
      if (response.requires2FA) {
        setRequires2FA(true)
        setPendingToken(response.pendingToken || '')
        toast.info('2FA Required', 'Enter your authenticator code to continue')
        return
      }
      
      // Normal login — extract user/tokens (may be nested under .data)
      const payload = response.data || response
      setAuth(payload.user, payload.tokens?.accessToken, payload.tokens?.refreshToken)
      toast.success('Login successful!', 'Redirecting...')
      navTimerRef.current = setTimeout(() => navigate(getReturnPath()), 500)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Login failed', err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!twoFactorCode || twoFactorCode.length < 6) {
      toast.error('Invalid code', 'Please enter your 6-digit authenticator code')
      return
    }

    setLoading(true)
    try {
      const response = await authApi.verify2FALogin(pendingToken, twoFactorCode, rememberMe)
      const data = response.data || response
      
      setAuth(data.user, data.tokens?.accessToken, data.tokens?.refreshToken)
      toast.success('Login successful!', 'Redirecting...')
      navTimerRef.current = setTimeout(() => navigate(getReturnPath()), 500)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Verification failed', err.response?.data?.message || 'Invalid 2FA code')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setRequires2FA(false)
    setPendingToken('')
    setTwoFactorCode('')
  }

  // 2FA Challenge Step
  if (requires2FA) {
    return (
      <div
      className="rounded-2xl p-8"
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)',
      }}
    >
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-xl" style={{ background: 'hsl(var(--primary) / 0.1)', border: '1px solid hsl(var(--primary) / 0.2)' }}>
              <Shield className="h-8 w-8" style={{ color: 'hsl(var(--primary))' }} />
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Two-Factor Authentication</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>
        <form onSubmit={handle2FAVerify} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="twoFactorCode" className="text-sm font-medium">
              Authentication Code
            </label>
            <Input
              id="twoFactorCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || twoFactorCode.length < 6}>
            {loading ? 'Verifying...' : 'Verify & Sign In'}
          </Button>

          <Button type="button" variant="ghost" className="w-full" onClick={handleBack}>
            Back to Login
          </Button>
        </form>
      </div>
    )
  }

  // Normal Login Step
  return (
    <div
      className="rounded-2xl p-8"
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)',
      }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your account to continue</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                className="rounded"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <Link
              to="/auth/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full h-10" disabled={loading || isLoading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
      </form>
      <div className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/auth/register" className="text-primary font-medium hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  )
}

export default Login
