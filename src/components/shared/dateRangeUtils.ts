export type DateRangePreset = '7d' | '30d' | '90d' | '1y' | 'custom'

export interface DateRange {
  startDate: string
  endDate: string
}

export function computeDateRange(preset: DateRangePreset): DateRange {
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
