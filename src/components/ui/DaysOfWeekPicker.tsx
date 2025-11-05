import { useState } from 'react';
import { Badge } from './Badge';
import { cn } from '@/lib/utils';

interface DaysOfWeekPickerProps {
  value?: number[];
  onChange?: (days: number[]) => void;
  className?: string;
  disabled?: boolean;
}

const DAYS = [
  { label: 'Sun', value: 0, short: 'S' },
  { label: 'Mon', value: 1, short: 'M' },
  { label: 'Tue', value: 2, short: 'T' },
  { label: 'Wed', value: 3, short: 'W' },
  { label: 'Thu', value: 4, short: 'T' },
  { label: 'Fri', value: 5, short: 'F' },
  { label: 'Sat', value: 6, short: 'S' },
];

export function DaysOfWeekPicker({ 
  value = [], 
  onChange, 
  className,
  disabled = false 
}: DaysOfWeekPickerProps) {
  const [selectedDays, setSelectedDays] = useState<number[]>(value);

  const toggleDay = (day: number) => {
    if (disabled) return;

    const newSelection = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day].sort();
    
    setSelectedDays(newSelection);
    onChange?.(newSelection);
  };

  const isSelected = (day: number) => selectedDays.includes(day);

  return (
    <div className={cn('flex gap-2', className)}>
      {DAYS.map((day) => (
        <button
          key={day.value}
          type="button"
          onClick={() => toggleDay(day.value)}
          disabled={disabled}
          className={cn(
            'flex flex-col items-center justify-center w-12 h-12 rounded-lg border-2 transition-all',
            'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            isSelected(day.value)
              ? 'bg-primary text-primary-foreground border-primary font-semibold'
              : 'bg-background border-border hover:border-primary/50',
            disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
          )}
          aria-label={day.label}
          aria-pressed={isSelected(day.value)}
        >
          <span className="text-xs font-medium">{day.short}</span>
        </button>
      ))}
    </div>
  );
}

export function DaysOfWeekBadges({ days }: { days: number[] }) {
  if (!days || days.length === 0) {
    return <Badge variant="outline">No days selected</Badge>;
  }

  const sortedDays = [...days].sort();
  const dayLabels = sortedDays.map(day => DAYS.find(d => d.value === day)?.label).filter(Boolean);

  if (sortedDays.length === 7) {
    return <Badge variant="secondary">Every day</Badge>;
  }

  if (sortedDays.length === 5 && sortedDays.every(d => d >= 1 && d <= 5)) {
    return <Badge variant="secondary">Weekdays</Badge>;
  }

  if (sortedDays.length === 2 && sortedDays.includes(0) && sortedDays.includes(6)) {
    return <Badge variant="secondary">Weekends</Badge>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {dayLabels.map((label, idx) => (
        <Badge key={idx} variant="outline" className="text-xs">
          {label}
        </Badge>
      ))}
    </div>
  );
}
