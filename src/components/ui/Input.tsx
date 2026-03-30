import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  error?: boolean
  inputSize?: 'sm' | 'default' | 'lg'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftIcon, rightIcon, error, inputSize = 'default', ...props }, ref) => {
    if (leftIcon || rightIcon) {
      return (
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              'flex w-full rounded-lg border bg-background text-sm transition-all duration-150',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50',
              {
                'h-8 text-xs': inputSize === 'sm',
                'h-9': inputSize === 'default',
                'h-10': inputSize === 'lg',
                'border-input': !error,
                'border-destructive focus:ring-destructive/30': error,
                'pl-9': leftIcon,
                'pr-9': rightIcon,
                'px-3.5': !leftIcon && !rightIcon,
              },
              className
            )}
            style={{
              boxShadow: 'none',
            }}
            onFocus={(e) => {
              if (!error) {
                e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--primary) / 0.12)'
              } else {
                e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--destructive) / 0.12)'
              }
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none'
              props.onBlur?.(e)
            }}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center pointer-events-none text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
      )
    }

    return (
      <input
        type={type}
        className={cn(
          'flex w-full rounded-lg border bg-background px-3.5 text-sm transition-all duration-150',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          {
            'h-8 text-xs px-2.5': inputSize === 'sm',
            'h-9': inputSize === 'default',
            'h-10': inputSize === 'lg',
            'border-input': !error,
            'border-destructive focus:ring-destructive/30': error,
          },
          className
        )}
        style={{ boxShadow: 'none' }}
        onFocus={(e) => {
          if (!error) {
            e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--primary) / 0.12)'
          } else {
            e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--destructive) / 0.12)'
          }
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'none'
          props.onBlur?.(e)
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
