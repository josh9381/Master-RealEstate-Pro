import { cn } from '@/lib/utils'

interface Tab {
  value: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 border-b', className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            value === tab.value
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
