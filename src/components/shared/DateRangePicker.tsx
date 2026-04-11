import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { computeDateRange } from './dateRangeUtils'
import type { DateRangePreset, DateRange } from './dateRangeUtils'

export type { DateRangePreset, DateRange }

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
        aria-label="Date range preset"
        className="px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
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
          <Input
            type="date"
            aria-label="Start date"
            className="w-auto px-2 py-1 text-sm"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="End date"
            className="w-auto px-2 py-1 text-sm"
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
