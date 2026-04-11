import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Bookmark,
  Plus,
  Trash2,
  Star,
  Check,
  X,
  Save,
  Loader2,
} from 'lucide-react'
import { savedFiltersApi, type SavedFilterView } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

interface FilterConfig {
  status: string[]
  source: string[]
  scoreRange: [number, number]
  dateRange: { from: string; to: string }
  tags: string[]
  assignedTo: string[]
}

interface SavedFilterViewsProps {
  currentFilters: FilterConfig
  currentScoreFilter: string
  currentSortField?: string
  currentSortDirection?: string
  onLoadView: (view: SavedFilterView) => void
  hasActiveFilters: boolean
}

function SavedFilterViews({
  currentFilters,
  currentScoreFilter,
  currentSortField,
  currentSortDirection,
  onLoadView,
  hasActiveFilters,
}: SavedFilterViewsProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Fetch saved views
  const { data: viewsResponse, isLoading } = useQuery({
    queryKey: ['saved-filter-views'],
    queryFn: () => savedFiltersApi.list(),
  })

  const views: SavedFilterView[] = viewsResponse?.data || []

  // Create view mutation
  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof savedFiltersApi.create>[0]) => savedFiltersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filter-views'] })
      toast.success('Filter view saved')
      setShowSaveForm(false)
      setNewViewName('')
    },
    onError: () => {
      toast.error('Failed to save filter view')
    },
  })

  // Delete view mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => savedFiltersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filter-views'] })
      toast.success('Filter view deleted')
      setConfirmDeleteId(null)
      if (activeViewId === confirmDeleteId) setActiveViewId(null)
    },
    onError: () => {
      toast.error('Failed to delete filter view')
    },
  })

  const handleSaveView = () => {
    if (!newViewName.trim()) return
    createMutation.mutate({
      name: newViewName.trim(),
      filterConfig: currentFilters,
      scoreFilter: currentScoreFilter,
      sortField: currentSortField,
      sortDirection: currentSortDirection,
      isDefault: false,
      isShared: false,
    })
  }

  const handleLoadView = (view: SavedFilterView) => {
    setActiveViewId(view.id)
    onLoadView(view)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Saved views as clickable pills */}
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        views.map((view) => (
          <div key={view.id} className="group relative">
            <Button
              size="sm"
              variant={activeViewId === view.id ? 'default' : 'outline'}
              onClick={() => handleLoadView(view)}
              className="h-8 text-xs pr-7"
            >
              {view.isDefault && <Star className="h-3 w-3 mr-1 fill-current" />}
              <Bookmark className="h-3 w-3 mr-1" />
              {view.name}
            </Button>
            {/* Delete button on hover */}
            {confirmDeleteId === view.id ? (
              <div className="absolute -top-1 -right-1 flex gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteMutation.mutate(view.id)
                  }}
                  className="rounded-full bg-destructive text-destructive-foreground p-0.5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmDeleteId(null)
                  }}
                  className="rounded-full bg-muted text-muted-foreground p-0.5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmDeleteId(view.id)
                }}
                className="absolute -top-1 -right-1 rounded-full bg-muted p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background focus-visible:opacity-100"
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        ))
      )}

      {/* Save current filters button */}
      {showSaveForm ? (
        <div className="flex items-center gap-1.5">
          <Input
            placeholder="View name..."
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            className="h-8 w-40 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveView()
              if (e.key === 'Escape') {
                setShowSaveForm(false)
                setNewViewName('')
              }
            }}
          />
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleSaveView}
            disabled={!newViewName.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => {
              setShowSaveForm(false)
              setNewViewName('')
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => setShowSaveForm(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Save View
          </Button>
        )
      )}

      {/* Clear active view */}
      {activeViewId && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-muted-foreground"
          onClick={() => setActiveViewId(null)}
        >
          <X className="h-3 w-3 mr-1" />
          Clear View
        </Button>
      )}
    </div>
  )
}

export { SavedFilterViews }
