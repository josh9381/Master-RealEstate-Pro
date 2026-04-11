import { useState, useRef, useEffect } from 'react'
import { Settings, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { DashboardWidgetPrefs } from '@/hooks/useDashboardPreferences'
import { WIDGET_GROUPS } from '@/hooks/useDashboardPreferences'
import { cn } from '@/lib/utils'

interface DashboardCustomizerProps {
  prefs: DashboardWidgetPrefs
  onToggle: (key: keyof DashboardWidgetPrefs) => void
  onReset: () => void
}

export function DashboardCustomizer({ prefs, onToggle, onReset }: DashboardCustomizerProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        aria-label="Customize dashboard"
        aria-expanded={open}
      >
        <Settings className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute right-0 mt-1 w-72 bg-card border rounded-lg shadow-lg z-20 p-3" role="dialog" aria-label="Dashboard customization">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Customize Dashboard</h3>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onReset}>
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {WIDGET_GROUPS.map((group) => (
              <div key={group.tab}>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">{group.tab}</p>
                <div className="space-y-1">
                  {group.widgets.map((widget) => (
                    <label
                      key={widget.key}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                        'hover:bg-accent/50 transition-colors'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={prefs[widget.key]}
                        onChange={() => onToggle(widget.key)}
                        className="rounded cursor-pointer"
                      />
                      <span className="text-sm">{widget.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
