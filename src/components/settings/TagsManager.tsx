import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
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
  Loader2
} from 'lucide-react'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useToast } from '@/hooks/useToast'
import { tagsApi } from '@/lib/api'

interface TagData {
  id: string
  name: string
  color: string
  category: string
  usageCount: number
  lastUsed: string
  description?: string
}

const tagColors = [
  { name: 'Red', value: 'bg-red-500' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Yellow', value: 'bg-yellow-500' },
  { name: 'Green', value: 'bg-green-500' },
  { name: 'Cyan', value: 'bg-cyan-500' },
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Purple', value: 'bg-purple-500' },
  { name: 'Pink', value: 'bg-pink-500' },
  { name: 'Gray', value: 'bg-gray-500' },
]

// Color mapping from stored hex/name to Tailwind class
function getColorClass(color?: string): string {
  if (!color) return 'bg-blue-500'
  if (color.startsWith('bg-')) return color
  // Map common color names
  const map: Record<string, string> = {
    red: 'bg-red-500', orange: 'bg-orange-500', yellow: 'bg-yellow-500',
    green: 'bg-green-500', cyan: 'bg-cyan-500', blue: 'bg-blue-500',
    purple: 'bg-purple-500', pink: 'bg-pink-500', gray: 'bg-gray-500',
  }
  return map[color.toLowerCase()] || 'bg-blue-500'
}

const categories = ['Priority', 'Company Size', 'Action Required', 'Status', 'Timeline', 'Industry']

export function TagsManager() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTag, setEditingTag] = useState<TagData | null>(null)
  const [newTag, setNewTag] = useState({
    name: '',
    color: 'bg-blue-500',
    category: 'Priority',
    description: ''
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
    return raw.map((t: any) => ({
      id: t.id,
      name: t.name,
      color: getColorClass(t.color),
      category: t.category || 'Priority',
      usageCount: t._count?.leads || t.usageCount || 0,
      lastUsed: t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : 'N/A',
      description: t.description || '',
    }))
  })()

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: (data: { name: string; color?: string }) => tagsApi.createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success(`Tag "${newTag.name}" created successfully`)
      setShowAddModal(false)
      setNewTag({ name: '', color: 'bg-blue-500', category: 'Priority', description: '' })
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
      setNewTag({ name: '', color: 'bg-blue-500', category: 'Priority', description: '' })
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

  const filteredTags = tags.filter((tag: TagData) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
      category: tag.category,
      description: tag.description || ''
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

  const handleDeleteTag = (id: string) => {
    if (confirm('Are you sure you want to delete this tag?')) {
      deleteTagMutation.mutate(id)
    }
  }

  const handleMergeTags = () => {
    toast.info('Merge tags functionality coming soon')
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tags Manager</h1>
          <p className="mt-2 text-muted-foreground">Organize and manage your lead tags</p>
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
          <h1 className="text-3xl font-bold">Tags Manager</h1>
          <p className="mt-2 text-muted-foreground">
            Organize and manage your lead tags
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleMergeTags}>
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
              Across {new Set(tags.map((t: TagData) => t.category)).size} categories
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
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Tag categories available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tags by name, category, or description..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Tags Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tags</CardTitle>
          <CardDescription>
            Manage your tag library and view usage statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTags.map((tag: TagData) => (
                <TableRow key={tag.id}>
                  <TableCell>
                    <Badge className={`${tag.color} text-white`}>
                      {tag.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tag.category}
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
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {tag.description || '-'}
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

          {filteredTags.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No tags found matching your search
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Tag Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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
                <label className="text-sm font-medium">Category</label>
                <select
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"
                  value={newTag.category}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setNewTag({ ...newTag, category: e.target.value })
                  }
                >
                  {categories.map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Color</label>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {tagColors.map((color) => (
                    <button
                      key={color.value}
                      className={`h-10 rounded-md ${color.value} ${
                        newTag.color === color.value ? 'ring-2 ring-primary ring-offset-2' : ''
                      }`}
                      onClick={() => setNewTag({ ...newTag, color: color.value })}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Input
                  placeholder="Brief description of when to use this tag"
                  value={newTag.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewTag({ ...newTag, description: e.target.value })
                  }
                  className="mt-2"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingTag(null)
                    setNewTag({ name: '', color: 'bg-blue-500', category: 'Priority', description: '' })
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
