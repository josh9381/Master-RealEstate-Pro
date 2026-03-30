import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  selectSize?: 'sm' | 'default' | 'lg'
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, selectSize = 'default', children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'flex w-full appearance-none rounded-lg border bg-background pr-9 text-sm transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            {
              'h-8 px-2.5 text-xs': selectSize === 'sm',
              'h-9 px-3.5': selectSize === 'default',
              'h-10 px-3.5': selectSize === 'lg',
              'border-input': !error,
              'border-destructive focus:ring-destructive/30': error,
            },
            className
          )}
          style={{ boxShadow: 'none' }}
          onFocus={(e) => {
            if (!error) {
              e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--primary) / 0.12)'
            }
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none'
            props.onBlur?.(e)
          }}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
        />
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
