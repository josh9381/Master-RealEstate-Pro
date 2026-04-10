import { TrendingUp, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { fmtMoney } from '@/lib/metricsCalculator';

export type PredictionType = 'probability' | 'value' | 'time' | 'risk';

const PROBABILITY_THRESHOLDS = { HIGH: 75, MEDIUM: 50, LOW: 25 } as const;
const VALUE_THRESHOLDS = { HIGH: 20000, MEDIUM: 10000 } as const;

interface PredictionBadgeProps {
  type: PredictionType;
  value: number | string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * PredictionBadge Component
 * Displays AI prediction badges for leads (conversion probability, deal value, best contact time, churn risk)
 */
export const PredictionBadge = ({
  type,
  value,
  label,
  size = 'md',
  showIcon = true,
  className,
}: PredictionBadgeProps) => {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'border font-medium inline-flex items-center gap-1.5',
          'bg-muted text-muted-foreground border-border',
          size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-base px-3 py-1.5' : 'text-sm px-2.5 py-1',
          className
        )}
      >
        <span>N/A</span>
      </Badge>
    );
  }

  const getConfig = () => {
    switch (type) {
      case 'probability': {
        const prob = typeof value === 'number' ? value : parseFloat(value as string) || 0;
        return {
          icon: TrendingUp,
          color: prob >= PROBABILITY_THRESHOLDS.HIGH ? 'bg-success/10 text-success border-success/20' :
                 prob >= PROBABILITY_THRESHOLDS.MEDIUM ? 'bg-warning/10 text-warning border-warning/20' :
                 prob >= PROBABILITY_THRESHOLDS.LOW ? 'bg-warning/10 text-warning border-warning/20' :
                 'bg-destructive/10 text-destructive border-destructive/20',
          label: label || 'Conversion',
          displayValue: `${prob}%`,
        };
      }
      case 'value': {
        const val = typeof value === 'number' ? value : parseFloat(value as string) || 0;
        return {
          icon: DollarSign,
          color: val >= VALUE_THRESHOLDS.HIGH ? 'bg-success/10 text-success border-success/20' :
                 val >= VALUE_THRESHOLDS.MEDIUM ? 'bg-primary/10 text-primary border-primary/20' :
                 'bg-muted text-foreground border-border',
          label: label || 'Est. Value',
          displayValue: fmtMoney(val),
        };
      }
      case 'time': {
        const displayValue = value?.toString() || 'N/A';
        return {
          icon: Clock,
          color: 'bg-purple-100 text-purple-700 border-purple-200',
          label: label || 'Best Time',
          displayValue,
        };
      }
      case 'risk': {
        const riskValue = value?.toString() || 'low';
        const risk = riskValue.toLowerCase();
        return {
          icon: AlertTriangle,
          color: risk === 'high' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                 risk === 'medium' ? 'bg-warning/10 text-warning border-warning/20' :
                 'bg-success/10 text-success border-success/20',
          label: label || 'Churn Risk',
          displayValue: riskValue.charAt(0).toUpperCase() + riskValue.slice(1),
        };
      }
      default:
        return {
          icon: TrendingUp,
          color: 'bg-muted text-muted-foreground border-border',
          label: label || '',
          displayValue: value?.toString() || 'N/A',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'border font-medium inline-flex items-center gap-1.5',
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizeClasses[size]} />}
      {config.label && <span className="font-semibold">{config.label}:</span>}
      <span>{config.displayValue}</span>
    </Badge>
  );
};

export default PredictionBadge;
