import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/store/authStore'
import { PasswordStrengthIndicator, isPasswordStrong } from '@/components/auth/PasswordStrengthIndicator'

function Register() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { register, isLoading } = useAuthStore()
  const navTimerRef = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => { clearTimeout(navTimerRef.current) }, [])
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    tosAccepted: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toast.error('Missing fields', 'Please fill in all required fields')
      return
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Password mismatch', 'Passwords do not match')
      return
    }
    
    if (formData.password.length < 8) {
      toast.warning('Weak password', 'Password should be at least 8 characters')
      return
    }

    if (!isPasswordStrong(formData.password)) {
      toast.warning('Weak password', 'Password must contain uppercase, lowercase, number, and special character')
      return
    }

    if (!formData.tosAccepted) {
      toast.error('Terms required', 'You must accept the Terms of Service to continue')
      return
    }

    try {
      await register({ 
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email, 
        password: formData.password,
        tosAccepted: true,
      })
      toast.success('Account created!', 'Please check your email to verify your account.')
      navTimerRef.current = setTimeout(() => navigate('/'), 500)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; errors?: unknown } } }
      const errorMessage = err.response?.data?.message || 'Could not create account'
      toast.error('Registration failed', errorMessage)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Get started with your free account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium">
                First Name
              </label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium">
                Last Name
              </label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
            <PasswordStrengthIndicator password={formData.password} />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <label className="flex items-start space-x-2 text-sm">
            <input
              type="checkbox"
              className="rounded mt-0.5"
              checked={formData.tosAccepted}
              onChange={(e) => setFormData({ ...formData, tosAccepted: e.target.checked })}
              disabled={isLoading}
            />
            <span className="text-muted-foreground">
              I agree to the{' '}
              <Link to="/terms-of-service" target="_blank" className="text-primary hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/terms-of-service" target="_blank" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </span>
          </label>

          <Button type="submit" className="w-full" disabled={isLoading || !formData.tosAccepted}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col space-y-4">
        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}

export default Register
