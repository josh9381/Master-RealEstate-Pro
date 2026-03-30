import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
  badge?: React.ReactNode
}

export function PageHeader({ title, description, children, className, badge }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6', className)}
    >
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          {children}
        </div>
      )}
    </motion.div>
  )
}

interface StatCardProps {
  value: string | number
  label: string
  icon?: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  change?: string
  color?: string
  delay?: number
}

export function StatCard({ value, label, icon: Icon, trend, change, color, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      className="premium-card rounded-xl p-5 relative overflow-hidden group"
    >
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle, ${color || 'hsl(var(--primary) / 0.08)'} 0%, transparent 70%)`,
          transform: 'translate(30%, -30%)',
        }}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-3xl font-bold mt-1.5 tracking-tight">{value}</p>
        </div>
        {Icon && (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
            style={{
              background: color ? `${color}20` : 'hsl(var(--primary) / 0.1)',
              border: `1px solid ${color ? `${color}30` : 'hsl(var(--primary) / 0.2)'}`,
            }}
          >
            <Icon
              className="h-5 w-5"
              style={{ color: color || 'hsl(var(--primary))' }}
            />
          </div>
        )}
      </div>
      {(trend || change) && (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium">
          {trend === 'up' && (
            <span className="text-emerald-600 dark:text-emerald-400">↑ {change}</span>
          )}
          {trend === 'down' && (
            <span className="text-red-600 dark:text-red-400">↓ {change}</span>
          )}
          {trend === 'neutral' && (
            <span className="text-muted-foreground">→ {change}</span>
          )}
        </div>
      )}
    </motion.div>
  )
}
