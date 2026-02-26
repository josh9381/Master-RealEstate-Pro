import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Filter, Calendar, Tag, User, Star, Building } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { tagsApi, usersApi } from '@/lib/api'

interface FilterConfig {
  status: string[]
  source: string[]
  scoreRange: [number, number]
  dateRange: { from: string; to: string }
  tags: string[]
  assignedTo: string[]
}

interface AdvancedFiltersProps {
  isOpen: boolean
  onClose: () => void
  onApply: (filters: FilterConfig) => void
  currentFilters: FilterConfig
}

const statusOptions = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost']
const sourceOptions = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Campaign', 'Direct']

export function AdvancedFilters({ isOpen, onClose, onApply, currentFilters }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterConfig>(currentFilters)

  // Fetch dynamic tag options from API
  const { data: tagOptions = [] } = useQuery({
    queryKey: ['filter-tags'],
    queryFn: async () => {
      try {
        const response = await tagsApi.getTags()
        const tags = response?.data?.tags || response?.tags || response || []
        return Array.isArray(tags) ? tags.map((t: { name: string }) => t.name) : []
      } catch {
        return ['Enterprise', 'Hot Lead', 'Demo Scheduled', 'Follow-up', 'High Value', 'Partner']
      }
    },
    staleTime: 120_000,
  })

  // Fetch dynamic assigned-to options from API
  const { data: assignedToOptions = [] } = useQuery({
    queryKey: ['filter-team-members'],
    queryFn: async () => {
      try {
        const response = await usersApi.getTeamMembers()
        const members = response?.data?.users || response?.users || response || []
        return Array.isArray(members)
          ? [...members.map((u: { firstName?: string; lastName?: string; name?: string }) =>
              u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown'
            ), 'Unassigned']
          : ['Unassigned']
      } catch {
        return ['Unassigned']
      }
    },
    staleTime: 120_000,
  })

  const handleApply = () => {
    onApply(filters)
    onClose()
  }

  const handleClear = () => {
    const emptyFilters: FilterConfig = {
      status: [],
      source: [],
      scoreRange: [0, 100],
      dateRange: { from: '', to: '' },
      tags: [],
      assignedTo: [],
    }
    setFilters(emptyFilters)
  }

  const toggleArrayFilter = (key: keyof FilterConfig, value: string) => {
    const current = filters[key] as string[]
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    setFilters({ ...filters, [key]: updated })
  }

  const activeFilterCount = 
    filters.status.length +
    filters.source.length +
    filters.tags.length +
    filters.assignedTo.length +
    (filters.scoreRange[0] > 0 || filters.scoreRange[1] < 100 ? 1 : 0) +
    (filters.dateRange.from || filters.dateRange.to ? 1 : 0)

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Slide-out Panel */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-80 transform border-r bg-background shadow-xl transition-transform duration-300 overflow-y-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b bg-background p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Advanced Filters</h2>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Sections */}
        <div className="p-4 space-y-6">
          {/* Status Filter */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium mb-3">
              <Star className="h-4 w-4 text-muted-foreground" />
              <span>Status</span>
            </label>
            <div className="space-y-2">
              {statusOptions.map((status) => (
                <label
                  key={status}
                  className="flex items-center space-x-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={filters.status.includes(status)}
                    onChange={() => toggleArrayFilter('status', status)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm group-hover:text-primary transition-colors">
                    {status}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Source Filter */}
          <div className="pt-4 border-t">
            <label className="flex items-center space-x-2 text-sm font-medium mb-3">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span>Source</span>
            </label>
            <div className="space-y-2">
              {sourceOptions.map((source) => (
                <label
                  key={source}
                  className="flex items-center space-x-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={filters.source.includes(source)}
                    onChange={() => toggleArrayFilter('source', source)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm group-hover:text-primary transition-colors">
                    {source}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Lead Score Range */}
          <div className="pt-4 border-t">
            <label className="flex items-center justify-between text-sm font-medium mb-3">
              <span className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span>Lead Score</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {filters.scoreRange[0]} - {filters.scoreRange[1]}
              </span>
            </label>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Min Score</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.scoreRange[0]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFilters({
                      ...filters,
                      scoreRange: [parseInt(e.target.value), filters.scoreRange[1]]
                    })
                  }
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Max Score</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.scoreRange[1]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFilters({
                      ...filters,
                      scoreRange: [filters.scoreRange[0], parseInt(e.target.value)]
                    })
                  }
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="pt-4 border-t">
            <label className="flex items-center space-x-2 text-sm font-medium mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Date Added</span>
            </label>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">From</label>
                <Input
                  type="date"
                  value={filters.dateRange.from}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFilters({
                      ...filters,
                      dateRange: { ...filters.dateRange, from: e.target.value }
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To</label>
                <Input
                  type="date"
                  value={filters.dateRange.to}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFilters({
                      ...filters,
                      dateRange: { ...filters.dateRange, to: e.target.value }
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Tags Filter */}
          <div className="pt-4 border-t">
            <label className="flex items-center space-x-2 text-sm font-medium mb-3">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span>Tags</span>
            </label>
            <div className="space-y-2">
              {tagOptions.map((tag) => (
                <label
                  key={tag}
                  className="flex items-center space-x-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={filters.tags.includes(tag)}
                    onChange={() => toggleArrayFilter('tags', tag)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm group-hover:text-primary transition-colors">
                    {tag}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Assigned To Filter */}
          <div className="pt-4 border-t">
            <label className="flex items-center space-x-2 text-sm font-medium mb-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Assigned To</span>
            </label>
            <div className="space-y-2">
              {assignedToOptions.map((person) => (
                <label
                  key={person}
                  className="flex items-center space-x-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={filters.assignedTo.includes(person)}
                    onChange={() => toggleArrayFilter('assignedTo', person)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm group-hover:text-primary transition-colors">
                    {person}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-background p-4 space-y-2">
          <Button onClick={handleApply} className="w-full">
            Apply Filters
            {activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Button>
          <Button onClick={handleClear} variant="outline" className="w-full">
            Clear All
          </Button>
        </div>
      </div>
    </>
  )
}
