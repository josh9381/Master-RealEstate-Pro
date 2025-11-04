import { useState, useEffect } from 'react'
import { Mail, Users, Send, Calendar, BarChart3, FileText, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast'
import { messagesApi } from '@/lib/api'

const NewsletterManagement = () => {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()
  const [newsletters, setNewsletters] = useState([
    {
      id: 1,
      name: 'Weekly Digest',
      subject: 'This Week in Tech - January Edition',
      subscribers: 12450,
      status: 'scheduled',
      sendDate: '2024-01-22 09:00 AM',
      openRate: 0,
      clickRate: 0,
    },
    {
      id: 2,
      name: 'Product Updates',
      subject: 'New Features You\'ll Love',
      subscribers: 8900,
      status: 'sent',
      sendDate: '2024-01-15 10:00 AM',
      openRate: 42.5,
      clickRate: 8.2,
    },
    {
      id: 3,
      name: 'Monthly Report',
      subject: 'Your December Performance Summary',
      subscribers: 15600,
      status: 'sent',
      sendDate: '2024-01-01 08:00 AM',
      openRate: 38.7,
      clickRate: 6.5,
    },
  ])

  useEffect(() => {
    loadNewsletters()
  }, [])

  const loadNewsletters = async (showRefreshState = false) => {
    try {
      if (showRefreshState) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await messagesApi.getMessages({ type: 'NEWSLETTER' })
      
      if (response && Array.isArray(response)) {
        setNewsletters(response)
      }
    } catch (error) {
      console.error('Failed to load newsletters:', error)
      toast.error('Failed to load newsletters, using sample data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadNewsletters(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Newsletter Management</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your email newsletters
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Mail className="h-4 w-4 mr-2" />
            Create Newsletter
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading newsletters...</p>
          </div>
        </Card>
      ) : (
        <>
      <div className="hidden">Wrapper for loading state</div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24,567</div>
            <p className="text-xs text-muted-foreground">+1,234 this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Newsletters Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">This year</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Open Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">40.3%</div>
            <p className="text-xs text-muted-foreground">+2.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Click Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7.4%</div>
            <p className="text-xs text-muted-foreground">Industry avg: 5.2%</p>
          </CardContent>
        </Card>
      </div>

      {/* Newsletters List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Newsletters</CardTitle>
              <CardDescription>Manage scheduled and sent newsletters</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                Filter
              </Button>
              <Button variant="outline" size="sm">
                Sort
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {newsletters.map((newsletter) => (
              <div key={newsletter.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100">
                      <Mail className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold">{newsletter.name}</h4>
                        <Badge variant={newsletter.status === 'sent' ? 'default' : 'secondary'}>
                          {newsletter.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{newsletter.subject}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{newsletter.subscribers.toLocaleString()} subscribers</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{newsletter.sendDate}</span>
                        </span>
                        {newsletter.status === 'sent' && (
                          <>
                            <span>{newsletter.openRate}% opens</span>
                            <span>{newsletter.clickRate}% clicks</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {newsletter.status === 'sent' ? (
                      <>
                        <Button variant="outline" size="sm">
                          View Report
                        </Button>
                        <Button variant="outline" size="sm">
                          Duplicate
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          Send Now
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm">
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Newsletter */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Newsletter</CardTitle>
          <CardDescription>Set up your newsletter campaign</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Newsletter Name</label>
              <input
                type="text"
                placeholder="e.g., Weekly Digest"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Template</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Basic Newsletter</option>
                <option>Product Update</option>
                <option>Company News</option>
                <option>Event Announcement</option>
                <option>Custom Template</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Subject Line</label>
            <input
              type="text"
              placeholder="Enter your email subject"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Preview Text</label>
            <input
              type="text"
              placeholder="This appears after the subject line"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Subscriber List</label>
            <select className="w-full px-3 py-2 border rounded-lg" multiple>
              <option>All Subscribers (24,567)</option>
              <option>Active Users (18,900)</option>
              <option>Premium Members (5,667)</option>
              <option>Newsletter Only (12,345)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">Hold Ctrl/Cmd to select multiple</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Send Date</label>
              <input type="date" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Send Time</label>
              <input type="time" className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <div className="flex space-x-2">
            <Button>Continue to Design</Button>
            <Button variant="outline">Save Draft</Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscriber Lists */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriber Lists</CardTitle>
          <CardDescription>Manage your newsletter audiences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'All Subscribers', count: 24567, growth: '+5.3%', active: 18900 },
              { name: 'Active Users', count: 18900, growth: '+4.1%', active: 18900 },
              { name: 'Premium Members', count: 5667, growth: '+8.7%', active: 5234 },
              { name: 'Newsletter Only', count: 12345, growth: '+3.2%', active: 9876 },
            ].map((list) => (
              <div key={list.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-semibold">{list.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {list.count.toLocaleString()} subscribers • {list.active.toLocaleString()} active
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary">{list.growth}</Badge>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>Newsletter engagement trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Best Send Time</h4>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">Tuesday</p>
                <p className="text-sm text-muted-foreground">10:00 AM EST</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Top Performing</h4>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">Product Updates</p>
                <p className="text-sm text-muted-foreground">45.2% open rate</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Unsubscribe Rate</h4>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">0.8%</p>
                <p className="text-sm text-muted-foreground">Below industry avg</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Newsletter Templates</CardTitle>
          <CardDescription>Pre-designed templates for quick creation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { name: 'Basic Newsletter', uses: 45 },
              { name: 'Product Update', uses: 32 },
              { name: 'Company News', uses: 28 },
              { name: 'Event Announcement', uses: 19 },
              { name: 'Promotional', uses: 23 },
              { name: 'Welcome Series', uses: 67 },
              { name: 'Re-engagement', uses: 15 },
              { name: 'Survey Request', uses: 12 },
            ].map((template) => (
              <div
                key={template.name}
                className="p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-center h-24 bg-muted rounded-lg mb-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h4 className="font-semibold text-sm mb-1">{template.name}</h4>
                <p className="text-xs text-muted-foreground">{template.uses} uses</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
};

export default NewsletterManagement;
