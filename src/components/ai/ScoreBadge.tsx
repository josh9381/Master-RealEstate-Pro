import { Badge } from '@/components/ui/Badge';
import { Flame, Thermometer, Snowflake, CircleDot } from 'lucide-react';

const SCORE_THRESHOLDS = { HOT: 80, WARM: 50, COOL: 25 } as const;

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showValue?: boolean;
  className?: string;
}

export function ScoreBadge({ 
  score, 
  size = 'md', 
  showIcon = true, 
  showValue = false,
  className = '' 
}: ScoreBadgeProps) {
  // Determine category and styling based on score
  const getScoreCategory = () => {
    if (score >= SCORE_THRESHOLDS.HOT) {
      return {
        label: 'Hot',
        icon: Flame,
        className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
        iconColor: 'text-destructive'
      };
    } else if (score >= SCORE_THRESHOLDS.WARM) {
      return {
        label: 'Warm',
        icon: Thermometer,
        className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
        iconColor: 'text-warning'
      };
    } else if (score >= SCORE_THRESHOLDS.COOL) {
      return {
        label: 'Cool',
        icon: Snowflake,
        className: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
        iconColor: 'text-primary'
      };
    } else {
      return {
        label: 'Cold',
        icon: CircleDot,
        className: 'bg-muted text-muted-foreground border-border hover:bg-accent',
        iconColor: 'text-muted-foreground'
      };
    }
  };

  const category = getScoreCategory();
  const Icon = category.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  return (
    <Badge 
      variant="outline" 
      className={`${category.className} ${sizeClasses[size]} font-medium border ${className}`}
    >
      {showIcon && <Icon size={iconSizes[size]} className={`mr-1 ${category.iconColor}`} />}
      {category.label}
      {showValue && <span className="ml-1 font-bold">{score}</span>}
    </Badge>
  );
}
