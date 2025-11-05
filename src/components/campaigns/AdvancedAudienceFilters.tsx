import { useState } from 'react'
import { X, Plus, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'

export interface AudienceFilter {
  field: string
  operator: string
  value: string | number | string[]
}

export interface SavedSegment {
  id: string
  name: string
  filters: AudienceFilter[]
  leadCount: number
}

interface AdvancedAudienceFiltersProps {
  filters: AudienceFilter[]
  onChange: (filters: AudienceFilter[]) => void
  leadCount: number
  savedSegments?: SavedSegment[]
  onSaveSegment?: (name: string, filters: AudienceFilter[]) => void
  onLoadSegment?: (segment: SavedSegment) => void
}

const FILTER_FIELDS = [
  { value: 'status', label: 'Lead Status', type: 'select' },
  { value: 'score', label: 'Lead Score', type: 'number' },
  { value: 'source', label: 'Lead Source', type: 'text' },
  { value: 'value', label: 'Lead Value', type: 'number' },
  { value: 'tags', label: 'Tags', type: 'tags' },
  { value: 'createdAt', label: 'Created Date', type: 'date' },
  { value: 'lastContact', label: 'Last Contact', type: 'date' },
  { value: 'customFields.industry', label: 'Industry', type: 'text' },
  { value: 'customFields.companySize', label: 'Company Size', type: 'number' },
  { value: 'customFields.budget', label: 'Budget', type: 'number' },
]

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

const OPERATORS = {
  text: [
    { value: 'equals', label: 'equals' },
    { value: 'contains', label: 'contains' },
    { value: 'startsWith', label: 'starts with' },
    { value: 'endsWith', label: 'ends with' },
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'greaterThan', label: '>' },
    { value: 'lessThan', label: '<' },
    { value: 'greaterThanOrEqual', label: '>=' },
    { value: 'lessThanOrEqual', label: '<=' },
  ],
  select: [
    { value: 'equals', label: 'is' },
    { value: 'notEquals', label: 'is not' },
  ],
  tags: [
    { value: 'includes', label: 'includes' },
    { value: 'excludes', label: 'excludes' },
  ],
  date: [
    { value: 'before', label: 'before' },
    { value: 'after', label: 'after' },
    { value: 'between', label: 'between' },
    { value: 'lastNDays', label: 'in last N days' },
  ],
}

export function AdvancedAudienceFilters({
  filters,
  onChange,
  leadCount,
  savedSegments = [],
  onSaveSegment,
  onLoadSegment,
}: AdvancedAudienceFiltersProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [segmentName, setSegmentName] = useState('')

  const addFilter = () => {
    onChange([
      ...filters,
      { field: 'status', operator: 'equals', value: 'new' },
    ])
  }

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index))
  }

  const updateFilter = (index: number, updates: Partial<AudienceFilter>) => {
    const newFilters = [...filters]
    newFilters[index] = { ...newFilters[index], ...updates }
    onChange(newFilters)
  }

  const getOperators = (fieldType: string) => {
    return OPERATORS[fieldType as keyof typeof OPERATORS] || OPERATORS.text
  }

  const renderFilterValue = (filter: AudienceFilter, index: number) => {
    const field = FILTER_FIELDS.find(f => f.value === filter.field)
    if (!field) return null

    switch (field.type) {
      case 'select':
        if (filter.field === 'status') {
          return (
            <select
              value={filter.value as string}
              onChange={(e) => updateFilter(index, { value: e.target.value })}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          )
        }
        break

      case 'number':
        return (
          <Input
            type="number"
            value={filter.value as number}
            onChange={(e) => updateFilter(index, { value: parseInt(e.target.value) || 0 })}
            placeholder="Enter value"
            className="flex-1"
          />
        )

      case 'date':
        if (filter.operator === 'lastNDays') {
          return (
            <Input
              type="number"
              value={filter.value as number}
              onChange={(e) => updateFilter(index, { value: parseInt(e.target.value) || 0 })}
              placeholder="Number of days"
              className="flex-1"
            />
          )
        }
        return (
          <Input
            type="date"
            value={filter.value as string}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="flex-1"
          />
        )

      case 'tags':
        return (
          <Input
            type="text"
            value={filter.value as string}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            placeholder="Enter tag name"
            className="flex-1"
          />
        )

      default:
        return (
          <Input
            type="text"
            value={filter.value as string}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            placeholder="Enter value"
            className="flex-1"
          />
        )
    }
  }

  const handleSaveSegment = () => {
    if (segmentName.trim() && onSaveSegment) {
      onSaveSegment(segmentName, filters)
      setSegmentName('')
      setShowSaveDialog(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Active Filters */}
      <div className="space-y-3">
        {filters.map((filter, index) => {
          const field = FILTER_FIELDS.find(f => f.value === filter.field)
          const operators = getOperators(field?.type || 'text')

          return (
            <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
              {/* Field Selection */}
              <select
                value={filter.field}
                onChange={(e) => {
                  const newField = FILTER_FIELDS.find(f => f.value === e.target.value)
                  const newOperators = getOperators(newField?.type || 'text')
                  updateFilter(index, {
                    field: e.target.value,
                    operator: newOperators[0].value,
                    value: newField?.type === 'number' ? 0 : '',
                  })
                }}
                className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {FILTER_FIELDS.map(field => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>

              {/* Operator Selection */}
              <select
                value={filter.operator}
                onChange={(e) => updateFilter(index, { operator: e.target.value })}
                className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {operators.map(op => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>

              {/* Value Input */}
              {renderFilterValue(filter, index)}

              {/* Remove Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFilter(index)}
                className="h-9 w-9 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        })}
      </div>

      {/* Add Filter Button */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addFilter}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Filter
        </Button>

        {filters.length > 0 && onSaveSegment && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSaveDialog(!showSaveDialog)}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save Segment
          </Button>
        )}

        {/* Lead Count Badge */}
        {filters.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {leadCount.toLocaleString()} leads match
          </Badge>
        )}
      </div>

      {/* Save Segment Dialog */}
      {showSaveDialog && (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
          <Input
            type="text"
            value={segmentName}
            onChange={(e) => setSegmentName(e.target.value)}
            placeholder="Segment name..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleSaveSegment()}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleSaveSegment}
            disabled={!segmentName.trim()}
          >
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowSaveDialog(false)
              setSegmentName('')
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Saved Segments */}
      {savedSegments.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Saved Segments</label>
          <div className="flex flex-wrap gap-2">
            {savedSegments.map(segment => (
              <Badge
                key={segment.id}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                onClick={() => onLoadSegment?.(segment)}
              >
                {segment.name} ({segment.leadCount})
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
