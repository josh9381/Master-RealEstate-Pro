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
  Keyboard
} from 'lucide-react'

interface Shortcut {
  keys: string[]
  description: string
  category: string
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ['Alt', 'D'], description: 'Go to Dashboard', category: 'Navigation' },
  { keys: ['Alt', 'L'], description: 'Go to Leads', category: 'Navigation' },
  { keys: ['Alt', 'C'], description: 'Go to Communication', category: 'Navigation' },
  { keys: ['Alt', 'S'], description: 'Go to Settings', category: 'Navigation' },
  
  // Actions
  { keys: ['Alt', 'N'], description: 'Create new lead', category: 'Actions' },
  { keys: ['Alt', 'R'], description: 'Refresh dashboard', category: 'Actions' },
  { keys: ['Alt', 'K'], description: 'Open global search', category: 'Actions' },
  { keys: ['Esc'], description: 'Close modal/panel', category: 'Actions' },
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'Actions' },
  
  // Dashboard
  { keys: ['Alt', '1'], description: 'Overview tab', category: 'Dashboard' },
  { keys: ['Alt', '2'], description: 'Activity tab', category: 'Dashboard' },
  { keys: ['Alt', '3'], description: 'Campaigns tab', category: 'Dashboard' },
  { keys: ['Alt', '4'], description: 'Alerts tab', category: 'Dashboard' },
  
  // AI Features
  { keys: ['Alt', 'A'], description: 'Toggle AI Assistant', category: 'AI Features' },
  
  // Communication
  { keys: ['Enter'], description: 'Send reply', category: 'Communication' },
  { keys: ['Shift', 'Enter'], description: 'New line in reply', category: 'Communication' },
]

const categories = [
  { name: 'Navigation', icon: Navigation, color: 'text-primary' },
  { name: 'Actions', icon: Zap, color: 'text-primary' },
  { name: 'Dashboard', icon: Search, color: 'text-success' },
  { name: 'AI Features', icon: Keyboard, color: 'text-warning' },
  { name: 'Communication', icon: MessageSquare, color: 'text-info' },
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
