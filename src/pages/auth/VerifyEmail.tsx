import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/lib/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please check your email link.');
      return;
    }

    const verify = async () => {
      try {
        const result = await authApi.verifyEmail(token);
        setStatus('success');
        setMessage(result.message || 'Email verified successfully!');
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The link may have expired.');
      }
    };

    verify();
  }, [token]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Email Verification</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {status === 'loading' && (
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-muted-foreground">Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-green-600 dark:text-green-400 font-medium">{message}</p>
            <Button asChild>
              <Link to="/auth/login">Continue to Login</Link>
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-red-600 dark:text-red-400 font-medium">{message}</p>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/auth/login">Back to Login</Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VerifyEmail;
