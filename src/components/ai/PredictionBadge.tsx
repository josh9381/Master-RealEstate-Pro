import { TrendingUp, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export type PredictionType = 'probability' | 'value' | 'time' | 'risk';

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
          'bg-gray-100 text-gray-500 border-gray-200',
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
          color: prob >= 75 ? 'bg-green-100 text-green-700 border-green-200' :
                 prob >= 50 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                 prob >= 25 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                 'bg-red-100 text-red-700 border-red-200',
          label: label || 'Conversion',
          displayValue: `${prob}%`,
        };
      }
      case 'value': {
        const val = typeof value === 'number' ? value : parseFloat(value as string) || 0;
        return {
          icon: DollarSign,
          color: val >= 20000 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                 val >= 10000 ? 'bg-blue-100 text-blue-700 border-blue-200' :
                 'bg-slate-100 text-slate-700 border-slate-200',
          label: label || 'Est. Value',
          displayValue: `$${val.toLocaleString()}`,
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
          color: risk === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
                 risk === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                 'bg-green-100 text-green-700 border-green-200',
          label: label || 'Churn Risk',
          displayValue: riskValue.charAt(0).toUpperCase() + riskValue.slice(1),
        };
      }
      default:
        return {
          icon: TrendingUp,
          color: 'bg-gray-100 text-gray-700 border-gray-200',
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
