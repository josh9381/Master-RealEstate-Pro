import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, User, Mail, Target, Zap, Settings, FileText, DollarSign, Users, TrendingUp, Clock, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { getUserItem, setUserItem } from '@/lib/userStorage'

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchResult {
  id: string | number
  type: 'lead' | 'campaign' | 'workflow' | 'contact' | 'page'
  title: string
  subtitle?: string
  description?: string
  url: string
  icon: React.ReactNode
}

const RECENT_SEARCHES_KEY = 'recent_searches'
const MAX_RECENT_SEARCHES = 8

function getRecentSearches(userId: string | undefined): string[] {
  const raw = getUserItem(userId, RECENT_SEARCHES_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function addRecentSearch(userId: string | undefined, query: string) {
  if (!query || query.length < 2) return
  const recent = getRecentSearches(userId)
  const filtered = recent.filter((s: string) => s.toLowerCase() !== query.toLowerCase())
  filtered.unshift(query)
  setUserItem(userId, RECENT_SEARCHES_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT_SEARCHES)))
}

function clearRecentSearches(userId: string | undefined) {
  setUserItem(userId, RECENT_SEARCHES_KEY, JSON.stringify([]))
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.user?.id)

  // Debounce search input — 300ms delay, min 2 characters
  useEffect(() => {
    if (searchQuery.length < 2) {
      setDebouncedQuery('')
      return
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch leads
  const { data: leadsData } = useQuery({
    queryKey: ['search-leads', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return null
      const response = await api.get('/leads', { params: { search: debouncedQuery, limit: 5 } })
      return response.data?.data || response.data
    },
    enabled: debouncedQuery.length >= 2,
  })

  // Fetch campaigns
  const { data: campaignsData } = useQuery({
    queryKey: ['search-campaigns', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return null
      const response = await api.get('/campaigns', { params: { search: debouncedQuery, limit: 5 } })
      return response.data?.data || response.data
    },
    enabled: debouncedQuery.length >= 2,
  })

  // Fetch workflows
  const { data: workflowsData } = useQuery({
    queryKey: ['search-workflows', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return null
      const response = await api.get('/workflows', { params: { search: debouncedQuery, limit: 5 } })
      return response.data?.data || response.data
    },
    enabled: debouncedQuery.length >= 2,
  })

  // Static pages/features to search
  const staticPages = useMemo(() => [
    { id: 'dashboard', type: 'page', title: 'Dashboard', description: 'View your overview and statistics', url: '/dashboard', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'leads', type: 'page', title: 'Leads', description: 'Manage your leads and contacts', url: '/leads', icon: <User className="w-4 h-4" /> },
    { id: 'campaigns', type: 'page', title: 'Campaigns', description: 'Create and manage campaigns', url: '/campaigns', icon: <Target className="w-4 h-4" /> },
    { id: 'automation', type: 'page', title: 'Automation', description: 'Workflow automation', url: '/workflows', icon: <Zap className="w-4 h-4" /> },
    { id: 'analytics', type: 'page', title: 'Analytics', description: 'View reports and insights', url: '/analytics', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'communications', type: 'page', title: 'Communications', description: 'Inbox and messages', url: '/communications', icon: <Mail className="w-4 h-4" /> },
    { id: 'settings', type: 'page', title: 'Settings', description: 'Account and preferences', url: '/settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'billing', type: 'page', title: 'Billing', description: 'Subscription and invoices', url: '/billing', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'admin', type: 'page', title: 'Admin Panel', description: 'Organization management', url: '/admin', icon: <Users className="w-4 h-4" /> },
  ], [])

  // Combine all search results
  const searchResults = useMemo(() => {
    const results: SearchResult[] = []

    // Filter static pages (uses raw query for instant local filtering)
    if (searchQuery.length >= 2) {
      const filteredPages = staticPages.filter(page =>
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      results.push(...filteredPages as SearchResult[])
    }

    // Add leads
    if (leadsData?.leads) {
      const leadResults: SearchResult[] = leadsData.leads.map((lead: { id: string | number; firstName: string; lastName: string; email: string; status: string; source: string }) => ({
        id: lead.id,
        type: 'lead',
        title: `${lead.firstName} ${lead.lastName}`,
        subtitle: lead.email,
        description: `${lead.status} - ${lead.source}`,
        url: `/leads/${lead.id}`,
        icon: <User className="w-4 h-4" />,
      }))
      results.push(...leadResults)
    }

    // Add campaigns
    if (campaignsData?.campaigns) {
      const campaignResults: SearchResult[] = campaignsData.campaigns.map((campaign: { id: string | number; name: string; type: string; status: string; sent?: number }) => ({
        id: campaign.id,
        type: 'campaign',
        title: campaign.name,
        subtitle: campaign.type,
        description: `${campaign.status} - ${campaign.sent || 0} sent`,
        url: `/campaigns/${campaign.id}`,
        icon: <Target className="w-4 h-4" />,
      }))
      results.push(...campaignResults)
    }

    // Add workflows
    if (workflowsData?.workflows) {
      const workflowResults: SearchResult[] = workflowsData.workflows.map((workflow: { id: string | number; name: string; trigger: string; status: string; executionCount?: number }) => ({
        id: workflow.id,
        type: 'workflow',
        title: workflow.name,
        subtitle: workflow.trigger,
        description: `${workflow.status} - ${workflow.executionCount || 0} runs`,
        url: `/workflows/builder?id=${workflow.id}`,
        icon: <Zap className="w-4 h-4" />,
      }))
      results.push(...workflowResults)
    }

    return results
  }, [searchQuery, leadsData, campaignsData, workflowsData, staticPages])

  const handleSelectResult = useCallback((result: SearchResult) => {
    if (searchQuery.length >= 2) {
      addRecentSearch(userId, searchQuery)
    }
    navigate(result.url)
    onClose()
  }, [navigate, onClose, searchQuery, userId])

  const handleRecentSearchClick = useCallback((query: string) => {
    setSearchQuery(query)
    setDebouncedQuery(query)
    setSelectedIndex(0)
  }, [])

  const handleClearRecent = useCallback(() => {
    clearRecentSearches(userId)
    setRecentSearches([])
  }, [userId])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (searchResults[selectedIndex]) {
            handleSelectResult(searchResults[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, searchResults, onClose, handleSelectResult])

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setDebouncedQuery('')
      setSelectedIndex(0)
      setRecentSearches(getRecentSearches(userId))
    }
  }, [isOpen, userId])

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'lead': return 'Lead'
      case 'campaign': return 'Campaign'
      case 'workflow': return 'Workflow'
      case 'contact': return 'Contact'
      case 'page': return 'Page'
      default: return type
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'lead': return 'bg-blue-100 text-blue-700'
      case 'campaign': return 'bg-purple-100 text-purple-700'
      case 'workflow': return 'bg-green-100 text-green-700'
      case 'contact': return 'bg-orange-100 text-orange-700'
      case 'page': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-label="Global search"
        aria-modal="true"
        className="relative w-full max-w-2xl bg-card rounded-lg shadow-2xl border"
      >
        {/* Search Input */}
        <div className="flex items-center border-b px-4 py-3">
          <Search className="w-5 h-5 text-muted-foreground mr-3" />
          <Input
            type="text"
            placeholder="Search for leads, campaigns, workflows, pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border-0 focus:ring-0 text-base"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="ml-2"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {searchQuery.length < 2 ? (
            <div className="p-6 text-center text-muted-foreground">
              {/* Recent searches */}
              {recentSearches.length > 0 && searchQuery.length === 0 ? (
                <div className="text-left">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Recent Searches
                    </span>
                    <button
                      onClick={handleClearRecent}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {recentSearches.map((query) => (
                      <button
                        key={query}
                        onClick={() => handleRecentSearchClick(query)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-accent transition-colors"
                      >
                        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{query}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">{searchQuery.length === 0 ? 'Start typing to search across your workspace' : 'Type at least 2 characters to search'}</p>
                </>
              )}
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <kbd className="px-2 py-1 text-xs bg-muted rounded">↑</kbd>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">↓</kbd>
                <span className="text-xs">to navigate</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded ml-2">Enter</kbd>
                <span className="text-xs">to select</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded ml-2">Esc</kbd>
                <span className="text-xs">to close</span>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No results found</p>
              <p className="text-sm mt-1">Try searching with different keywords</p>
            </div>
          ) : (
            <div className="py-2">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelectResult(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-accent'
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{result.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeBadgeColor(result.type)}`}>
                        {getTypeLabel(result.type)}
                      </span>
                    </div>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    )}
                    {result.description && (
                      <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {searchResults.length > 0 && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found</span>
            <div className="flex gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded">⌘K</kbd>
                <span>to search</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
