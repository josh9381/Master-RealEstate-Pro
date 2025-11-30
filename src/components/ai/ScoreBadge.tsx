import { Badge } from '@/components/ui/Badge';
import { Flame, Thermometer, Snowflake, CircleDot } from 'lucide-react';

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
    if (score >= 80) {
      return {
        label: 'Hot',
        icon: Flame,
        className: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
        iconColor: 'text-red-500'
      };
    } else if (score >= 50) {
      return {
        label: 'Warm',
        icon: Thermometer,
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
        iconColor: 'text-yellow-500'
      };
    } else if (score >= 25) {
      return {
        label: 'Cool',
        icon: Snowflake,
        className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
        iconColor: 'text-blue-500'
      };
    } else {
      return {
        label: 'Cold',
        icon: CircleDot,
        className: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
        iconColor: 'text-gray-500'
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
