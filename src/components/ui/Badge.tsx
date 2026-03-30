import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'premium'
  size?: 'sm' | 'default' | 'lg'
  dot?: boolean
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'default', dot = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          {
            // Sizes
            'px-2 py-0.5 text-xs': size === 'sm',
            'px-2.5 py-0.5 text-xs': size === 'default',
            'px-3 py-1 text-sm': size === 'lg',
            // Variants
            'bg-primary/10 text-primary border border-primary/20': variant === 'default',
            'bg-secondary text-secondary-foreground border border-border': variant === 'secondary',
            'bg-destructive/10 text-destructive border border-destructive/20': variant === 'destructive',
            'border border-border text-foreground bg-transparent': variant === 'outline',
            'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20': variant === 'success',
            'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20': variant === 'warning',
            'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20': variant === 'info',
            'bg-gradient-to-r from-primary to-violet-500 text-white border-0 shadow-sm': variant === 'premium',
          },
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'inline-block w-1.5 h-1.5 rounded-full flex-shrink-0',
              {
                'bg-primary': variant === 'default',
                'bg-muted-foreground': variant === 'secondary',
                'bg-destructive': variant === 'destructive',
                'bg-emerald-500': variant === 'success',
                'bg-amber-500': variant === 'warning',
                'bg-blue-500': variant === 'info',
              }
            )}
          />
        )}
        {children}
      </div>
    )
  }
)
Badge.displayName = 'Badge'

export { Badge }
