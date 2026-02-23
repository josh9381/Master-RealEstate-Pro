import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { Mail, Layout, Type, Image, Link, Code, Eye, RefreshCw, Edit, Trash2, Plus, X, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast'
import { templatesApi } from '@/lib/api'

const CATEGORIES = ['Onboarding', 'Marketing', 'Content', 'Ecommerce', 'Transactional', 'Events', 'Custom'];

const EmailTemplatesLibrary = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; category: string; subject: string; body: string; description?: string; thumbnail?: string; usageCount?: number; isActive?: boolean; updatedAt?: string; createdAt?: string }>>([])
  const [activeCategory, setActiveCategory] = useState('All Templates')

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [previewTemplate, setPreviewTemplate] = useState<any>(null)

  // Create/Edit form state
  const [formName, setFormName] = useState('')
  const [formSubject, setFormSubject] = useState('')
  const [formCategory, setFormCategory] = useState('Marketing')
  const [formBody, setFormBody] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async (showRefreshState = false) => {
    try {
      if (showRefreshState) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await templatesApi.getEmailTemplates()
      
      if (response && Array.isArray(response)) {
        setTemplates(response)
      }
    } catch (error) {
      console.error('Failed to load email templates:', error)
      toast.error('Failed to load templates, using sample data')
      // Keep using mock data on error
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadTemplates(true)
  }

  const resetForm = () => {
    setFormName('')
    setFormSubject('')
    setFormCategory('Marketing')
    setFormBody('')
    setEditingTemplate(null)
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const openEditModal = (template: any) => {
    setEditingTemplate(template)
    setFormName(template.name || '')
    setFormSubject(template.subject || '')
    setFormCategory(template.category || 'Marketing')
    setFormBody(template.body || '')
    setShowCreateModal(true)
  }

  const handleSaveTemplate = async () => {
    if (!formName.trim()) {
      toast.error('Template name is required')
      return
    }
    if (!formSubject.trim()) {
      toast.error('Subject line is required')
      return
    }
    if (!formBody.trim()) {
      toast.error('Template body is required')
      return
    }

    setSaving(true)
    try {
      const data = {
        name: formName.trim(),
        subject: formSubject.trim(),
        category: formCategory,
        body: formBody.trim(),
      }

      if (editingTemplate) {
        await templatesApi.updateEmailTemplate(editingTemplate.id, data)
        toast.success('Template updated successfully')
      } else {
        await templatesApi.createEmailTemplate(data)
        toast.success('Template created successfully')
      }

      setShowCreateModal(false)
      resetForm()
      loadTemplates(true)
    } catch (error: any) {
      console.error('Failed to save template:', error)
      toast.error(error?.response?.data?.message || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    try {
      await templatesApi.deleteEmailTemplate(id)
      toast.success('Template deleted successfully')
      setShowDeleteConfirm(null)
      loadTemplates(true)
    } catch (error: any) {
      console.error('Failed to delete template:', error)
      toast.error(error?.response?.data?.message || 'Failed to delete template')
    }
  }

  const openPreview = (template: any) => {
    setPreviewTemplate(template)
    setShowPreviewModal(true)
  }

  const filteredTemplates = activeCategory === 'All Templates'
    ? templates
    : templates.filter(t => (t.category || '').toLowerCase() === activeCategory.toLowerCase())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Templates Library</h1>
          <p className="text-muted-foreground mt-2">
            Pre-designed templates for your email campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        </Card>
      ) : (
        <>
      <div className="hidden">Wrapper for loading state</div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">{templates.filter(t => t.isActive !== false).length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Used</CardTitle>
            <Layout className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{templates.length > 0 ? [...templates].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0]?.name || '—' : '—'}</div>
            <p className="text-xs text-muted-foreground">{templates.length > 0 ? `${[...templates].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0]?.usageCount || 0} uses` : 'No data yet'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(templates.map(t => t.category).filter(Boolean)).size}</div>
            <p className="text-xs text-muted-foreground">Unique categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length > 0 ? new Date([...templates].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())[0]?.updatedAt || '').toLocaleDateString() : '—'}</div>
            <p className="text-xs text-muted-foreground">{templates.length > 0 ? 'Most recent update' : 'No data yet'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Browse by Category</CardTitle>
          <CardDescription>Filter templates by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              'All Templates',
              ...CATEGORIES,
            ].map((category) => (
              <Badge
                key={category}
                variant={category === activeCategory ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Template Library</CardTitle>
              <CardDescription>Browse available templates</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Layout className="h-4 w-4 mr-2" />
                Grid
              </Button>
              <Button variant="outline" size="sm">
                <Type className="h-4 w-4 mr-2" />
                List
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                {activeCategory !== 'All Templates' ? `No templates in "${activeCategory}" category.` : 'Create your first email template to get started.'}
              </p>
              <Button onClick={openCreateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-center h-48 bg-gradient-to-br from-blue-50 to-purple-50">
                  <div className="text-6xl">{template.thumbnail || '📧'}</div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold truncate">{template.name}</h4>
                    <Badge variant="outline">{template.category || 'Uncategorized'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1 truncate">{template.subject}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>{template.usageCount || 0} uses</span>
                    <span>{template.updatedAt ? `Updated ${new Date(template.updatedAt).toLocaleDateString()}` : ''}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openPreview(template)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => navigate(`/campaigns/create?type=email&templateId=${template.id}&templateName=${encodeURIComponent(template.name)}&templateSubject=${encodeURIComponent(template.subject)}`)}>
                      <Send className="h-4 w-4 mr-1" />
                      Use
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditModal(template)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(template.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Create Custom Template */}
      <Card>
        <CardHeader>
          <CardTitle>Create Custom Template</CardTitle>
          <CardDescription>Build your own email template from scratch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Button onClick={openCreateModal} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create New Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Design Elements */}
      <Card>
        <CardHeader>
          <CardTitle>Template Design Elements</CardTitle>
          <CardDescription>Common components available in templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { name: 'Header', icon: Type, description: 'Logo and navigation' },
              { name: 'Hero Image', icon: Image, description: 'Featured image section' },
              { name: 'Text Blocks', icon: Type, description: 'Content paragraphs' },
              { name: 'Call to Action', icon: Link, description: 'Button or link' },
              { name: 'Product Grid', icon: Layout, description: 'Product showcase' },
              { name: 'Social Links', icon: Link, description: 'Social media icons' },
              { name: 'Footer', icon: Type, description: 'Contact and legal' },
              { name: 'Custom HTML', icon: Code, description: 'Your own code' },
            ].map((element) => (
              <div key={element.name} className="p-4 border rounded-lg">
                <div className="flex items-center justify-center h-16 bg-blue-50 rounded-lg mb-3">
                  <element.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-sm mb-1">{element.name}</h4>
                <p className="text-xs text-muted-foreground">{element.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Used</CardTitle>
          <CardDescription>Templates you've used recently</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">No recently used templates yet.</p>
          </div>
        </CardContent>
      </Card>

      {/* Template Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Template Settings</CardTitle>
          <CardDescription>Global template preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Default Font</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Arial</option>
                <option>Helvetica</option>
                <option>Georgia</option>
                <option>Times New Roman</option>
                <option>Verdana</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Primary Color</label>
              <input type="color" defaultValue="#0066cc" className="w-full h-10 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Company Logo URL</label>
            <input
              type="url"
              placeholder="https://example.com/logo.png"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">Include unsubscribe link</span>
              </label>
            </div>
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">Enable open tracking</span>
              </label>
            </div>
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">Enable click tracking</span>
              </label>
            </div>
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Include social sharing</span>
              </label>
            </div>
          </div>
          <Button>Save Settings</Button>
        </CardContent>
      </Card>
        </>
      )}

      {/* Create/Edit Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">{editingTemplate ? 'Edit Template' : 'Create New Template'}</h2>
              <Button variant="ghost" size="sm" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Template Name *</label>
                <Input
                  placeholder="e.g., Monthly Newsletter"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Subject Line *</label>
                <Input
                  placeholder="e.g., Your monthly update from {{company}}"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Body (HTML) *</label>
                <textarea
                  rows={10}
                  placeholder="Enter your email template HTML content..."
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {'{{variableName}}'} for template variables (e.g., {'{{lead.firstName}}'}, {'{{lead.email}}'})
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} disabled={saving}>
                {saving ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />{editingTemplate ? 'Updating...' : 'Creating...'}</>
                ) : (
                  editingTemplate ? 'Update Template' : 'Create Template'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">{previewTemplate.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">Subject: {previewTemplate.subject}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setShowPreviewModal(false); setPreviewTemplate(null); }}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6">
              <div className="border rounded-lg p-6 bg-white">
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewTemplate.body || '<p class="text-muted-foreground">No content</p>') }} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={() => { setShowPreviewModal(false); setPreviewTemplate(null); }}>
                Close
              </Button>
              <Button onClick={() => { setShowPreviewModal(false); openEditModal(previewTemplate); }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-lg font-bold mb-2">Delete Template</h2>
              <p className="text-muted-foreground">
                Are you sure you want to delete this template? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleDeleteTemplate(showDeleteConfirm)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplatesLibrary;
