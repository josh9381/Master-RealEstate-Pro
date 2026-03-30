import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm transition-all duration-150',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-y',
          {
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
Textarea.displayName = 'Textarea'

export { Textarea }
