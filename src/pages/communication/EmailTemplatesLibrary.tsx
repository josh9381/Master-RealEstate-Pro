import { useState, useEffect } from 'react'
import { Mail, Layout, Type, Image, Link, Code, Eye, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast'
import { templatesApi } from '@/lib/api'

const EmailTemplatesLibrary = () => {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()
  const [templates, setTemplates] = useState([
    {
      id: 1,
      name: 'Welcome Email',
      category: 'Onboarding',
      description: 'Warm welcome for new subscribers',
      thumbnail: '📧',
      uses: 1234,
      lastModified: '2 days ago',
    },
    {
      id: 2,
      name: 'Product Launch',
      category: 'Marketing',
      description: 'Announce new products or features',
      thumbnail: '🚀',
      uses: 567,
      lastModified: '1 week ago',
    },
    {
      id: 3,
      name: 'Newsletter',
      category: 'Content',
      description: 'Regular newsletter template',
      thumbnail: '📰',
      uses: 890,
      lastModified: '3 days ago',
    },
    {
      id: 4,
      name: 'Abandoned Cart',
      category: 'Ecommerce',
      description: 'Recover abandoned shopping carts',
      thumbnail: '🛒',
      uses: 456,
      lastModified: '5 days ago',
    },
    {
      id: 5,
      name: 'Thank You',
      category: 'Transactional',
      description: 'Thank customers for their purchase',
      thumbnail: '🙏',
      uses: 789,
      lastModified: '1 week ago',
    },
    {
      id: 6,
      name: 'Event Invitation',
      category: 'Events',
      description: 'Invite subscribers to events',
      thumbnail: '🎉',
      uses: 234,
      lastModified: '2 weeks ago',
    },
  ])

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
          <Button>
            <Layout className="h-4 w-4 mr-2" />
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
            <div className="text-2xl font-bold">48</div>
            <p className="text-xs text-muted-foreground">Across 8 categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Used</CardTitle>
            <Layout className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Welcome Email</div>
            <p className="text-xs text-muted-foreground">1,234 uses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Templates</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">User created</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2d ago</div>
            <p className="text-xs text-muted-foreground">Welcome Email</p>
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
              'Onboarding',
              'Marketing',
              'Content',
              'Ecommerce',
              'Transactional',
              'Events',
              'Custom',
            ].map((category) => (
              <Badge
                key={category}
                variant={category === 'All Templates' ? 'default' : 'outline'}
                className="cursor-pointer"
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
              <CardDescription>48 templates available</CardDescription>
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
          <div className="grid gap-4 md:grid-cols-3">
            {templates.map((template) => (
              <div key={template.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-center h-48 bg-gradient-to-br from-blue-50 to-purple-50">
                  <div className="text-6xl">{template.thumbnail}</div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{template.name}</h4>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>{template.uses} uses</span>
                    <span>Updated {template.lastModified}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button size="sm" className="flex-1">
                      Use Template
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Template Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Create Custom Template</CardTitle>
          <CardDescription>Build your own email template from scratch</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Template Name</label>
              <input
                type="text"
                placeholder="e.g., Monthly Newsletter"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Onboarding</option>
                <option>Marketing</option>
                <option>Content</option>
                <option>Ecommerce</option>
                <option>Transactional</option>
                <option>Events</option>
                <option>Custom</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <textarea
              rows={2}
              placeholder="Describe what this template is for..."
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="flex space-x-2">
            <Button>Start from Blank</Button>
            <Button variant="outline">Import HTML</Button>
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
            {[
              { name: 'Welcome Email', lastUsed: '2 hours ago', campaign: 'New Subscribers' },
              { name: 'Product Launch', lastUsed: '1 day ago', campaign: 'Spring Launch' },
              { name: 'Newsletter', lastUsed: '3 days ago', campaign: 'Weekly Digest' },
            ].map((recent, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{recent.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      Used in {recent.campaign} • {recent.lastUsed}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    Preview
                  </Button>
                  <Button variant="outline" size="sm">
                    Use Again
                  </Button>
                </div>
              </div>
            ))}
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
    </div>
  );
};

export default EmailTemplatesLibrary;
