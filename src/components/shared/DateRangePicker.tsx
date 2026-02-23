import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export type DateRangePreset = '7d' | '30d' | '90d' | '1y' | 'custom'

export interface DateRange {
  startDate: string
  endDate: string
}

interface DateRangePickerProps {
  value?: DateRangePreset
  onChange: (range: DateRange, preset: DateRangePreset) => void
  className?: string
  showCustom?: boolean
}

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
]

function computeDateRange(preset: DateRangePreset): DateRange {
  const now = new Date()
  const end = now.toISOString().split('T')[0]
  let start: Date

  switch (preset) {
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case '1y':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    case '30d':
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end,
  }
}

export function DateRangePicker({
  value = '30d',
  onChange,
  className = '',
  showCustom = false,
}: DateRangePickerProps) {
  const [preset, setPreset] = useState<DateRangePreset>(value)
  const [showCustomDates, setShowCustomDates] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handlePresetChange = (newPreset: DateRangePreset) => {
    if (newPreset === 'custom') {
      setShowCustomDates(true)
      return
    }
    setPreset(newPreset)
    setShowCustomDates(false)
    onChange(computeDateRange(newPreset), newPreset)
  }

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      setPreset('custom')
      onChange({ startDate: customStart, endDate: customEnd }, 'custom')
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <select
        className="px-3 py-2 text-sm border rounded-md bg-background"
        value={preset}
        onChange={(e) => handlePresetChange(e.target.value as DateRangePreset)}
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
        {showCustom && <option value="custom">Custom Range</option>}
      </select>

      {showCustom && showCustomDates && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="px-2 py-1 text-sm border rounded-md"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="date"
            className="px-2 py-1 text-sm border rounded-md"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
          />
          <Button size="sm" variant="outline" onClick={handleCustomApply}>
            Apply
          </Button>
        </div>
      )}
    </div>
  )
}

// Export the utility function for use in components that manage their own date state
export { computeDateRange }
