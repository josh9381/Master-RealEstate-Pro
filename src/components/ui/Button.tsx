import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'premium'
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs'
  loading?: boolean
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading, disabled, children, asChild, ...props }, ref) => {
    const baseStyles = cn(
      'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium',
      'transition-all duration-150 ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      'select-none',
      {
        // Variants
        'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm hover:shadow-lg':
          variant === 'default',
        'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98] shadow-sm':
          variant === 'destructive',
        'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98]':
          variant === 'outline',
        'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]':
          variant === 'secondary',
        'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]':
          variant === 'ghost',
        'text-primary underline-offset-4 hover:underline p-0 h-auto':
          variant === 'link',
        // Premium variant with gradient and glow
        'text-white active:scale-[0.98] overflow-hidden':
          variant === 'premium',
        // Sizes
        'h-9 px-4 py-2': size === 'default',
        'h-7 px-2.5 py-1 text-xs rounded-md': size === 'xs',
        'h-8 rounded-md px-3 text-xs': size === 'sm',
        'h-10 rounded-lg px-6 text-sm': size === 'lg',
        'h-9 w-9 p-0': size === 'icon',
      },
      className
    )

    const premiumStyle = variant === 'premium' ? {
      background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%)',
      boxShadow: '0 4px 14px 0 hsl(var(--primary) / 0.35)',
    } : undefined

    if (asChild && React.isValidElement(children)) {
      const childElement = children as React.ReactElement<{ className?: string }>
      return React.cloneElement(childElement, {
        className: cn(baseStyles, childElement.props.className),
      })
    }

    return (
      <button
        className={baseStyles}
        style={premiumStyle}
        ref={ref}
        disabled={loading || disabled}
        {...props}
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {variant === 'premium' && !loading && (
          <span
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
              transform: 'translateX(-100%)',
              transition: 'transform 0.4s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(100%)' }}
          />
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
