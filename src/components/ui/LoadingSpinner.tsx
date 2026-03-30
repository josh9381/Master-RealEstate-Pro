import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  label?: string
  fullPage?: boolean
}

export function LoadingSpinner({ size = 'md', className, label, fullPage = false }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }

  const spinner = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className={cn('relative', sizes[size])}>
        <motion.div
          className={cn('absolute inset-0 rounded-full border-2', sizes[size])}
          style={{
            borderColor: 'hsl(var(--primary) / 0.2)',
            borderTopColor: 'hsl(var(--primary))',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      {label && (
        <p className="text-sm text-muted-foreground animate-pulse">{label}</p>
      )}
    </div>
  )

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    )
  }

  return spinner
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="premium-card rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 rounded-lg bg-muted animate-pulse" />
        <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
      </div>
      <div className="h-8 w-24 rounded-lg bg-muted animate-pulse" />
      {Array.from({ length: lines - 2 }).map((_, i) => (
        <div key={i} className={cn('h-3 rounded-lg bg-muted animate-pulse', i % 2 === 0 ? 'w-full' : 'w-3/4')} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="premium-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 rounded bg-muted animate-pulse" style={{ width: `${60 + i * 20}px` }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 px-4 py-3 border-b last:border-0">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="h-4 rounded bg-muted animate-pulse"
              style={{
                width: `${50 + (colIdx * 30 + rowIdx * 10) % 80}px`,
                animationDelay: `${rowIdx * 0.05}s`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              border: '2px solid hsl(var(--primary) / 0.2)',
              borderTopColor: 'hsl(var(--primary))',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-2 rounded-full"
            style={{
              border: '2px solid hsl(var(--primary) / 0.1)',
              borderBottomColor: 'hsl(var(--primary) / 0.6)',
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
