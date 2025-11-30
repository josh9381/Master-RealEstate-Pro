import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const _navigate = useNavigate();

  const passwordRequirements = [
    { met: true, text: 'At least 8 characters' },
    { met: true, text: 'Contains uppercase letter' },
    { met: false, text: 'Contains lowercase letter' },
    { met: true, text: 'Contains a number' },
    { met: false, text: 'Contains special character' },
  ];

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

          <Button className="w-full">
            Reset Password
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
