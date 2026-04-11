import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useConfirm } from '@/hooks/useConfirm'
import { Input } from '@/components/ui/Input'
import { TAG_PICKER_COLORS } from '@/lib/chartColors'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Tag,
  TrendingUp,
  Users,
  Palette,
  Combine,
  Loader2,
  Shield,
} from 'lucide-react'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useToast } from '@/hooks/useToast'
import { tagsApi } from '@/lib/api'

interface TagData {
  id: string
  name: string
  color: string
  usageCount: number
  lastUsed: string
}

const tagColors = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Gray', value: '#6B7280' },
]

const DEFAULT_COLOR = '#3B82F6'

// Pre-built real estate tags that come pre-created for new organizations
const DEFAULT_TAGS = [
  // Lead Type
  { name: 'Buyer', color: '#3B82F6', group: 'Lead Type' },
  { name: 'Seller', color: '#3B82F6', group: 'Lead Type' },
  { name: 'Investor', color: '#3B82F6', group: 'Lead Type' },
  { name: 'Renter', color: '#3B82F6', group: 'Lead Type' },
  { name: 'Landlord', color: '#3B82F6', group: 'Lead Type' },
  // Priority
  { name: 'Hot Lead', color: '#EF4444', group: 'Priority' },
  { name: 'Warm Lead', color: '#F97316', group: 'Priority' },
  { name: 'Cold Lead', color: '#06B6D4', group: 'Priority' },
  // Source
  { name: 'Referral', color: '#22C55E', group: 'Source' },
  { name: 'Open House', color: '#22C55E', group: 'Source' },
  { name: 'Website', color: '#22C55E', group: 'Source' },
  { name: 'Social Media', color: '#22C55E', group: 'Source' },
  // Status
  { name: 'VIP', color: '#A855F7', group: 'Status' },
  { name: 'Follow-up Needed', color: '#EAB308', group: 'Status' },
  { name: 'Do Not Contact', color: '#6B7280', group: 'Status' },
]

const DEFAULT_TAG_NAMES = new Set(DEFAULT_TAGS.map(t => t.name))

// Normalize any stored color to hex
function toHexColor(color?: string | null): string {
  if (!color) return DEFAULT_COLOR
  if (color.startsWith('#')) return color
  // Map legacy Tailwind class names to hex
  const twMap: Record<string, string> = {
    'bg-red-500': '#EF4444', 'bg-orange-500': '#F97316', 'bg-yellow-500': '#EAB308',
    'bg-green-500': '#22C55E', 'bg-cyan-500': '#06B6D4', 'bg-blue-500': '#3B82F6',
    'bg-purple-500': '#A855F7', 'bg-pink-500': '#EC4899', 'bg-gray-500': '#6B7280',
  }
  if (twMap[color]) return twMap[color]
  // Map plain color names
  const nameMap: Record<string, string> = {
    red: '#EF4444', orange: '#F97316', yellow: '#EAB308',
    green: '#22C55E', cyan: '#06B6D4', blue: '#3B82F6',
    purple: '#A855F7', pink: '#EC4899', gray: '#6B7280',
  }
  return nameMap[color.toLowerCase()] || DEFAULT_COLOR
}

export function TagsManager() {
  const { toast } = useToast()
  const showConfirm = useConfirm()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTag, setEditingTag] = useState<TagData | null>(null)
  const [newTag, setNewTag] = useState({
    name: '',
    color: DEFAULT_COLOR,
  })

  // Fetch tags from API
  const { data: tagsResponse, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.getTags(),
  })

  // Transform API response to our TagData format
  const tags: TagData[] = (() => {
    const raw = tagsResponse?.data?.tags || tagsResponse?.data || tagsResponse?.tags || tagsResponse || []
    if (!Array.isArray(raw)) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return raw.map((t: any) => ({
      id: t.id,
      name: t.name,
      color: toHexColor(t.color),
      usageCount: t._count?.leads || t.usageCount || 0,
      lastUsed: t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : 'N/A',
    }))
  })()

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: (data: { name: string; color?: string }) => tagsApi.createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success(`Tag "${newTag.name}" created successfully`)
      setShowAddModal(false)
      setNewTag({ name: '', color: DEFAULT_COLOR })
    },
    onError: () => {
      toast.error('Failed to create tag')
    },
  })

  // Update tag mutation
  const updateTagMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; color?: string } }) => tagsApi.updateTag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success(`Tag "${newTag.name}" updated successfully`)
      setShowAddModal(false)
      setEditingTag(null)
      setNewTag({ name: '', color: DEFAULT_COLOR })
    },
    onError: () => {
      toast.error('Failed to update tag')
    },
  })

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: (id: string) => tagsApi.deleteTag(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      const tag = tags.find(t => t.id === deletedId)
      toast.success(`Tag "${tag?.name}" deleted successfully`)
    },
    onError: () => {
      toast.error('Failed to delete tag')
    },
  })

  const totalUsage = tags.reduce((acc: number, tag: TagData) => acc + tag.usageCount, 0)
  const mostUsedTag = tags.length > 0
    ? tags.reduce((prev: TagData, current: TagData) => prev.usageCount > current.usageCount ? prev : current)
    : null

  const handleAddTag = () => {
    if (!newTag.name.trim()) {
      toast.error('Tag name is required')
      return
    }
    createTagMutation.mutate({ name: newTag.name.trim(), color: newTag.color })
  }

  const handleEditTag = (tag: TagData) => {
    setEditingTag(tag)
    setNewTag({
      name: tag.name,
      color: tag.color,
    })
    setShowAddModal(true)
  }

  const handleUpdateTag = () => {
    if (!editingTag) return
    updateTagMutation.mutate({
      id: editingTag.id,
      data: { name: newTag.name.trim(), color: newTag.color }
    })
  }

  // Focus trap for tag modal
  const tagModalRef = useRef<HTMLDivElement>(null)
  const previousTagFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (showAddModal) {
      previousTagFocusRef.current = document.activeElement as HTMLElement
      const firstInput = tagModalRef.current?.querySelector<HTMLElement>('input, button, select, textarea')
      firstInput?.focus()
    } else if (previousTagFocusRef.current) {
      previousTagFocusRef.current.focus()
      previousTagFocusRef.current = null
    }
  }, [showAddModal])

  const handleTagModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowAddModal(false)
      setEditingTag(null)
      setNewTag({ name: '', color: DEFAULT_COLOR })
      return
    }
    if (e.key !== 'Tab') return
    const focusable = tagModalRef.current?.querySelectorAll<HTMLElement>(
      'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteTag = async (id: string) => {
    if (await showConfirm({ title: 'Delete Tag', message: 'Are you sure you want to delete this tag?', confirmLabel: 'Delete', variant: 'destructive' })) {
      deleteTagMutation.mutate(id)
    }
  }

  // Separate default vs custom tags
  const defaultTags = tags.filter((t: TagData) => DEFAULT_TAG_NAMES.has(t.name))
  const customTags = tags.filter((t: TagData) => !DEFAULT_TAG_NAMES.has(t.name))

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tags & Segments</h1>
          <p className="mt-2 text-muted-foreground">Organize and manage your lead tags and segment settings</p>
        </div>
        <ErrorBanner message={`Failed to load tags: ${error instanceof Error ? error.message : 'Unknown error'}`} retry={refetch} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tags & Segments</h1>
          <p className="mt-2 text-muted-foreground">
            Organize and manage your lead tags and segment settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled title="Merge tags functionality coming soon">
            <Combine className="mr-2 h-4 w-4" />
            Merge Tags
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tag
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tags</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tags.length}</div>
            <p className="text-xs text-muted-foreground">
              {tags.length} tags total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsage}</div>
            <p className="text-xs text-muted-foreground">
              Tags applied to leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Used</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostUsedTag?.name || '—'}</div>
            <p className="text-xs text-muted-foreground">
              {mostUsedTag ? `${mostUsedTag.usageCount} times` : 'No tags yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Colors Used</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(tags.map((t: TagData) => t.color)).size}</div>
            <p className="text-xs text-muted-foreground">
              Distinct colors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tags by name..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Default Tags Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            Default Tags
          </CardTitle>
          <CardDescription>
            Pre-built real estate tags provided for your organization. Default tags cannot be deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {defaultTags.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Last Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {defaultTags
                  .filter((tag: TagData) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((tag: TagData) => {
                    const group = DEFAULT_TAGS.find(dt => dt.name === tag.name)?.group || '—'
                    return (
                      <TableRow key={tag.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge style={{ backgroundColor: tag.color, color: '#fff' }}>
                              {tag.name}
                            </Badge>
                            <Badge variant="outline" className="text-xs">Default</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{group}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tag.usageCount}</span>
                            <span className="text-xs text-muted-foreground">leads</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tag.lastUsed}
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Default tags have not been created yet. These tags are recommended for real estate workflows:
              </p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_TAGS.map(dt => (
                  <Badge key={dt.name} style={{ backgroundColor: dt.color, color: '#fff' }} className="text-xs">
                    {dt.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Tags Section */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Tags</CardTitle>
          <CardDescription>
            Tags you&apos;ve created for your organization. Create, edit, or delete custom tags.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customTags
                .filter((tag: TagData) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((tag: TagData) => (
                <TableRow key={tag.id}>
                  <TableCell>
                    <Badge style={{ backgroundColor: tag.color, color: '#fff' }}>
                      {tag.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tag.usageCount}</span>
                      <span className="text-xs text-muted-foreground">leads</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tag.lastUsed}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditTag(tag)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTag(tag.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {customTags.filter((tag: TagData) => tag.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No custom tags match your search' : 'No custom tags yet. Click "Add Tag" to create one.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Segment Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle>Segment Settings</CardTitle>
          <CardDescription>
            Configure how segments behave across your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Auto-refresh interval</label>
              <p className="text-xs text-muted-foreground mb-2">How often segment member counts refresh</p>
              <select className="w-full px-3 py-2 border rounded-lg text-sm bg-background">
                <option value="1h">Every 1 hour</option>
                <option value="6h">Every 6 hours</option>
                <option value="24h" selected>Every 24 hours</option>
                <option value="manual">Manual only</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Default match type</label>
              <p className="text-xs text-muted-foreground mb-2">Whether new segments default to match ALL or ANY rules</p>
              <select className="w-full px-3 py-2 border rounded-lg text-sm bg-background">
                <option value="ALL" selected>Match ALL rules (AND)</option>
                <option value="ANY">Match ANY rule (OR)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Max segment rules</label>
              <p className="text-xs text-muted-foreground mb-2">Limit on number of rules per segment to prevent performance issues</p>
              <select className="w-full px-3 py-2 border rounded-lg text-sm bg-background">
                <option value="5">5 rules</option>
                <option value="10" selected>10 rules</option>
                <option value="20">20 rules</option>
                <option value="50">50 rules</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Segment color palette</label>
              <p className="text-xs text-muted-foreground mb-2">Default colors available when creating segments</p>
              <div className="flex gap-2 flex-wrap">
                {TAG_PICKER_COLORS.map(c => (
                  <div key={c} className="w-8 h-8 rounded-full border" style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Tag Modal */}
      {showAddModal && (
        <div
          ref={tagModalRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label={editingTag ? 'Edit Tag' : 'Add New Tag'}
          onKeyDown={handleTagModalKeyDown}
        >
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingTag ? 'Edit Tag' : 'Add New Tag'}</CardTitle>
              <CardDescription>
                {editingTag ? 'Update tag details' : 'Create a new tag for organizing leads'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tag Name</label>
                <Input
                  placeholder="e.g., Hot Lead"
                  value={newTag.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewTag({ ...newTag, name: e.target.value })
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Color</label>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {tagColors.map((color) => (
                    <button
                      key={color.value}
                      className={`h-10 rounded-md ${
                        newTag.color === color.value ? 'ring-2 ring-primary ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setNewTag({ ...newTag, color: color.value })}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingTag(null)
                    setNewTag({ name: '', color: DEFAULT_COLOR })
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingTag ? handleUpdateTag : handleAddTag}
                  className="flex-1"
                >
                  {editingTag ? 'Update Tag' : 'Create Tag'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
