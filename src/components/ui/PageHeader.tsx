import { type ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, icon, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2 bg-gradient-to-br from-primary/80 to-primary rounded-xl text-primary-foreground">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm sm:text-base text-muted-foreground leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
