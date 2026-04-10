import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface MiniCalendarProps {
  /** Dates that have events (ISO date strings or Date objects) */
  eventDates?: (string | Date)[]
  /** Currently selected date */
  selectedDate?: Date | null
  /** Callback when a day is clicked */
  onDateSelect?: (date: Date) => void
  className?: string
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function MiniCalendar({ eventDates = [], selectedDate, onDateSelect, className }: MiniCalendarProps) {
  const [viewDate, setViewDate] = useState(() => new Date())

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // Normalize event dates to YYYY-MM-DD strings for fast lookup
  const eventSet = useMemo(() => {
    const set = new Set<string>()
    for (const d of eventDates) {
      const date = typeof d === 'string' ? new Date(d) : d
      if (!isNaN(date.getTime())) {
        set.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`)
      }
    }
    return set
  }, [eventDates])

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = []

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) days.push(null)
    // Day numbers
    for (let d = 1; d <= daysInMonth; d++) days.push(d)

    return days
  }, [year, month])

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const selectedKey = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : null

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  const monthLabel = viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className={cn('select-none', className)}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={prevMonth} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={nextMonth} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-0 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0">
        {calendarDays.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />

          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateKey === todayKey
          const isSelected = dateKey === selectedKey
          const hasEvent = eventSet.has(dateKey)

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onDateSelect?.(new Date(year, month, day))}
              className={cn(
                'relative flex flex-col items-center justify-center h-8 w-full rounded text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
                isSelected
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : isToday
                  ? 'bg-accent font-semibold'
                  : 'hover:bg-accent/50'
              )}
            >
              {day}
              {hasEvent && (
                <span
                  className={cn(
                    'absolute bottom-0.5 h-1 w-1 rounded-full',
                    isSelected ? 'bg-primary-foreground' : 'bg-primary'
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
