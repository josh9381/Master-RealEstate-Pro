import { useMemo } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

interface Requirement {
  met: boolean;
  text: string;
}

function getStrength(password: string): { score: number; label: string; color: string; bgColor: string } {
  if (!password) return { score: 0, label: '', color: '', bgColor: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-destructive', bgColor: 'text-destructive' };
  if (score <= 3) return { score: 2, label: 'Fair', color: 'bg-warning', bgColor: 'text-warning' };
  if (score <= 4) return { score: 3, label: 'Good', color: 'bg-warning', bgColor: 'text-warning' };
  if (score <= 5) return { score: 4, label: 'Strong', color: 'bg-success', bgColor: 'text-success' };
  return { score: 5, label: 'Very Strong', color: 'bg-success', bgColor: 'text-success' };
}

export function PasswordStrengthIndicator({ password, showRequirements = true }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => getStrength(password), [password]);

  const requirements: Requirement[] = useMemo(() => [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), text: 'Contains uppercase letter' },
    { met: /[a-z]/.test(password), text: 'Contains lowercase letter' },
    { met: /[0-9]/.test(password), text: 'Contains a number' },
    { met: /[^A-Za-z0-9]/.test(password), text: 'Contains special character' },
  ], [password]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={`font-medium ${strength.bgColor}`}>{strength.label}</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                level <= strength.score ? strength.color : 'bg-secondary'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <div className="space-y-1">
          {requirements.map((req) => (
            <div key={req.text} className="flex items-center gap-1.5 text-xs">
              {req.met ? (
                <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className={req.met ? 'text-success' : 'text-muted-foreground'}>
                {req.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
