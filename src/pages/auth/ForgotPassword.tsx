import { Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useState } from 'react';
import { useToast } from '@/hooks/useToast';

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Email required', 'Please enter your email address');
      return;
    }
    
    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      toast.success('Email sent!', 'Check your inbox for password reset instructions');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Forgot Password?</CardTitle>
          <CardDescription className="text-center">
            No worries, we will send you reset instructions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button className="w-full" type="submit" loading={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          <div className="text-center">
            <Link
              to="/auth/login"
              className="text-sm text-primary hover:underline inline-flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Link>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center">
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

export default ForgotPassword;
