import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/lib/api'

function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const { setAuth, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // 2FA challenge state
  const [requires2FA, setRequires2FA] = useState(false)
  const [pendingToken, setPendingToken] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')

  // Show idle-timeout message if redirected from session manager
  useEffect(() => {
    if (searchParams.get('reason') === 'idle') {
      toast.warning('Session expired', 'You were logged out due to inactivity. Please sign in again.')
    }
  }, [searchParams, toast])

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
      toast.success('Login successful!', 'Redirecting to dashboard...')
      setTimeout(() => navigate('/'), 500)
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
      toast.success('Login successful!', 'Redirecting to dashboard...')
      setTimeout(() => navigate('/'), 500)
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
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center">Two-Factor Authentication</CardTitle>
          <CardDescription className="text-center">
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    )
  }

  // Normal Login Step
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
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
            <label htmlFor="password" className="text-sm font-medium">
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

          <Button type="submit" className="w-full" disabled={loading || isLoading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col space-y-4">
        <div className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/auth/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}

export default Login
