import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { authApi } from '@/lib/api';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const passwordRequirements = useMemo(() => [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), text: 'Contains uppercase letter' },
    { met: /[a-z]/.test(password), text: 'Contains lowercase letter' },
    { met: /[0-9]/.test(password), text: 'Contains a number' },
    { met: /[^A-Za-z0-9]/.test(password), text: 'Contains special character' },
  ], [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Password mismatch', 'Passwords do not match.');
      return;
    }

    const allMet = passwordRequirements.every(r => r.met);
    if (!allMet) {
      toast.error('Weak password', 'Please meet all password requirements.');
      return;
    }

    const token = searchParams.get('token');
    if (!token) {
      toast.error('Invalid link', 'No reset token found. Please request a new reset link.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success('Password reset!', 'Your password has been updated. Please sign in.');
      navigate('/auth/login');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Reset failed', err.response?.data?.message || 'Could not reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">New Password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm New Password</label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium mb-2">Password requirements:</p>
            {passwordRequirements.map((req, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <CheckCircle
                  className={`h-4 w-4 ${req.met ? 'text-green-600' : 'text-muted-foreground'}`}
                />
                <span className={req.met ? 'text-green-600' : 'text-muted-foreground'}>
                  {req.text}
                </span>
              </div>
            ))}
          </div>

          <Button className="w-full" onClick={handleSubmit} loading={loading} disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>

          <div className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Remember your password?{' '}
              <Link to="/auth/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
