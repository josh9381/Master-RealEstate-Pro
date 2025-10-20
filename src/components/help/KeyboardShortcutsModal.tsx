import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  X,
  Search,
  Navigation,
  Zap,
  MessageSquare,
  Users,
  Settings as SettingsIcon,
  Keyboard
} from 'lucide-react'

interface Shortcut {
  keys: string[]
  description: string
  category: string
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ['G', 'D'], description: 'Go to Dashboard', category: 'Navigation' },
  { keys: ['G', 'L'], description: 'Go to Leads', category: 'Navigation' },
  { keys: ['G', 'P'], description: 'Go to Pipeline', category: 'Navigation' },
  { keys: ['G', 'C'], description: 'Go to Communication', category: 'Navigation' },
  { keys: ['G', 'A'], description: 'Go to Analytics', category: 'Navigation' },
  { keys: ['G', 'S'], description: 'Go to Settings', category: 'Navigation' },
  { keys: ['G', 'F'], description: 'Go to Follow-ups', category: 'Navigation' },
  
  // Actions
  { keys: ['N'], description: 'Create new lead', category: 'Actions' },
  { keys: ['E'], description: 'Edit current lead', category: 'Actions' },
  { keys: ['Ctrl', 'S'], description: 'Save changes', category: 'Actions' },
  { keys: ['Ctrl', 'K'], description: 'Open command palette', category: 'Actions' },
  { keys: ['Esc'], description: 'Close modal/panel', category: 'Actions' },
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'Actions' },
  
  // Search
  { keys: ['/'], description: 'Focus search bar', category: 'Search' },
  { keys: ['Ctrl', 'F'], description: 'Find in page', category: 'Search' },
  { keys: ['F'], description: 'Open advanced filters', category: 'Search' },
  
  // Lead Management
  { keys: ['L', 'N'], description: 'Add note to lead', category: 'Lead Management' },
  { keys: ['L', 'T'], description: 'Add tag to lead', category: 'Lead Management' },
  { keys: ['L', 'A'], description: 'Assign lead', category: 'Lead Management' },
  { keys: ['L', 'S'], description: 'Change lead status', category: 'Lead Management' },
  { keys: ['L', 'D'], description: 'Delete lead', category: 'Lead Management' },
  
  // Communication
  { keys: ['C', 'E'], description: 'Compose email', category: 'Communication' },
  { keys: ['C', 'S'], description: 'Send SMS', category: 'Communication' },
  { keys: ['C', 'C'], description: 'Log call', category: 'Communication' },
  { keys: ['C', 'M'], description: 'Schedule meeting', category: 'Communication' },
  
  // Bulk Actions
  { keys: ['Ctrl', 'A'], description: 'Select all leads', category: 'Bulk Actions' },
  { keys: ['Shift', 'Click'], description: 'Select range', category: 'Bulk Actions' },
  { keys: ['Ctrl', 'Click'], description: 'Select multiple', category: 'Bulk Actions' },
  
  // AI Features
  { keys: ['A', 'I'], description: 'Open AI Assistant', category: 'AI Features' },
  { keys: ['A', 'E'], description: 'AI Email Composer', category: 'AI Features' },
  { keys: ['A', 'S'], description: 'AI Suggested Actions', category: 'AI Features' }
]

const categories = [
  { name: 'Navigation', icon: Navigation, color: 'text-blue-500' },
  { name: 'Actions', icon: Zap, color: 'text-purple-500' },
  { name: 'Search', icon: Search, color: 'text-green-500' },
  { name: 'Lead Management', icon: Users, color: 'text-orange-500' },
  { name: 'Communication', icon: MessageSquare, color: 'text-cyan-500' },
  { name: 'Bulk Actions', icon: SettingsIcon, color: 'text-pink-500' },
  { name: 'AI Features', icon: Keyboard, color: 'text-yellow-500' }
]

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  // Listen for '?' key to toggle modal
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '?' && !isOpen) {
        e.preventDefault()
        // This would be handled by parent component
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const filteredShortcuts = shortcuts.filter((shortcut) => {
    // Filter by category
    if (activeCategory !== 'all' && shortcut.category !== activeCategory) {
      return false
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        shortcut.description.toLowerCase().includes(query) ||
        shortcut.keys.join(' ').toLowerCase().includes(query) ||
        shortcut.category.toLowerCase().includes(query)
      )
    }

    return true
  })

  const groupedShortcuts = categories.reduce((acc, category) => {
    const categoryShortcuts = filteredShortcuts.filter(
      (s) => s.category === category.name
    )
    if (categoryShortcuts.length > 0) {
      acc[category.name] = categoryShortcuts
    }
    return acc
  }, {} as Record<string, Shortcut[]>)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Keyboard className="h-6 w-6" />
              <div>
                <CardTitle>Keyboard Shortcuts</CardTitle>
                <CardDescription>
                  Master these shortcuts to navigate faster
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shortcuts..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant={activeCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory('all')}
            >
              All
            </Button>
            {categories.map((category) => {
              const Icon = category.icon
              const count = shortcuts.filter((s) => s.category === category.name).length
              return (
                <Button
                  key={category.name}
                  variant={activeCategory === category.name ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(category.name)}
                  className="gap-2"
                >
                  <Icon className={`h-4 w-4 ${activeCategory === category.name ? '' : category.color}`} />
                  {category.name}
                  <Badge variant="secondary" className="ml-1">
                    {count}
                  </Badge>
                </Button>
              )
            })}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          {Object.keys(groupedShortcuts).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Keyboard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No shortcuts found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedShortcuts).map(([categoryName, categoryShortcuts]) => {
                const category = categories.find((c) => c.name === categoryName)
                const Icon = category?.icon || Keyboard
                return (
                  <div key={categoryName}>
                    <div className="flex items-center gap-2 mb-4">
                      <Icon className={`h-5 w-5 ${category?.color}`} />
                      <h3 className="font-semibold text-lg">{categoryName}</h3>
                      <Badge variant="secondary">{categoryShortcuts.length}</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {categoryShortcuts.map((shortcut, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <span className="text-sm">{shortcut.description}</span>
                          <div className="flex gap-1">
                            {shortcut.keys.map((key, keyIndex) => (
                              <kbd
                                key={keyIndex}
                                className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded shadow-sm min-w-[2rem] text-center"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>

        <div className="border-t p-4 bg-muted/50">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Press <kbd className="px-2 py-0.5 text-xs font-semibold bg-background border rounded">?</kbd> to show this dialog</span>
              <span>Press <kbd className="px-2 py-0.5 text-xs font-semibold bg-background border rounded">Esc</kbd> to close</span>
            </div>
            <span>{filteredShortcuts.length} shortcuts</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
