import { X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface FilterChip {
  id: string
  label: string
  value: string
}

interface ActiveFilterChipsProps {
  chips: FilterChip[]
  onRemove: (id: string) => void
  onClearAll: () => void
  resultCount?: number
}

export function ActiveFilterChips({ chips, onRemove, onClearAll, resultCount }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
      <span className="text-sm text-muted-foreground">Filters:</span>
      
      {chips.map((chip) => (
        <Badge
          key={chip.id}
          variant="secondary"
          className="gap-1 pl-3 pr-1"
        >
          <span className="text-xs">
            {chip.label}: <span className="font-medium">{chip.value}</span>
          </span>
          <button
            onClick={() => onRemove(chip.id)}
            className="ml-1 rounded-full p-0.5 hover:bg-background transition-colors"
            aria-label={`Remove ${chip.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {resultCount !== undefined && (
        <span className="text-sm text-muted-foreground">
          • {resultCount} results
        </span>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-6 px-2 text-xs"
      >
        Clear all
      </Button>
    </div>
  )
}
