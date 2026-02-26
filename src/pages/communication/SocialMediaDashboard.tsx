import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Facebook, Twitter, Instagram, Linkedin, Send, Calendar, BarChart3, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast'
import { messagesApi } from '@/lib/api'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'

const SocialMediaDashboard = () => {
  const { toast } = useToast()
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'published'>('all')
  const [postContent, setPostContent] = useState('')

  const { data: socialPosts = [], isLoading: loading, isFetching, refetch } = useQuery({
    queryKey: ['social-media-posts'],
    queryFn: async () => {
      const response = await messagesApi.getMessages({ type: 'SOCIAL' })
      const threads = response?.data?.threads || response?.threads || []
      return Array.isArray(threads) ? threads : []
    }
  })
  const refreshing = isFetching && !loading

  const handleRefresh = () => {
    refetch()
  }

  const platformIcons = {
    Facebook: Facebook,
    Twitter: Twitter,
    Instagram: Instagram,
    LinkedIn: Linkedin,
  };

  const platformColors = {
    Facebook: 'text-blue-600',
    Twitter: 'text-sky-500',
    Instagram: 'text-pink-600',
    LinkedIn: 'text-blue-700',
  };

  return (
    <div className="space-y-6">
      {/* Coming Soon Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-amber-800">Coming Soon — Social Media Integration</h3>
          <p className="text-sm text-amber-700 mt-1">
            Social media management requires platform API integrations which are not yet available.
            This feature is on the roadmap. In the meantime, use the Communications inbox for Email and SMS.
          </p>
        </div>
        <Badge variant="warning" className="shrink-0">Coming Soon</Badge>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Social Media Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage and schedule posts across all platforms
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button disabled title="Social media integration coming soon">
            <Send className="h-4 w-4 mr-2" />
            Create Post
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <>
      <div className="hidden">Wrapper for loading state</div>

      {/* Platform Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No data yet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No data yet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No data yet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Reach</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">No data yet</p>
          </CardContent>
        </Card>
      </div>

      {/* Connected Platforms */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Platforms</CardTitle>
          <CardDescription>Your social media accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { name: 'Facebook', followers: '—', status: 'disconnected' },
              { name: 'Twitter', followers: '—', status: 'disconnected' },
              { name: 'Instagram', followers: '—', status: 'disconnected' },
              { name: 'LinkedIn', followers: '—', status: 'disconnected' },
            ].map((platform) => {
              const Icon = platformIcons[platform.name as keyof typeof platformIcons];
              return (
                <div key={platform.name} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <Icon className={`h-8 w-8 ${platformColors[platform.name as keyof typeof platformColors]}`} />
                    <Badge variant={platform.status === 'connected' ? 'default' : 'secondary'}>
                      {platform.status}
                    </Badge>
                  </div>
                  <h4 className="font-semibold">{platform.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{platform.followers} followers</p>
                  <Button variant="outline" size="sm" className="mt-3 w-full" disabled title="Platform integration coming soon">
                    {platform.status === 'connected' ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled & Published Posts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Posts</CardTitle>
              <CardDescription>Scheduled and published content</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant={filterStatus === 'scheduled' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(filterStatus === 'scheduled' ? 'all' : 'scheduled')}>
                Scheduled
              </Button>
              <Button variant={filterStatus === 'published' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(filterStatus === 'published' ? 'all' : 'published')}>
                Published
              </Button>
              <Button variant={filterStatus === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('all')}>
                All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {socialPosts.filter(post => filterStatus === 'all' || post.status === filterStatus).map((post) => {
              const Icon = platformIcons[post.platform as keyof typeof platformIcons];
              return (
                <div key={post.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <Icon className={`h-5 w-5 ${platformColors[post.platform as keyof typeof platformColors]} mt-1`} />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold">{post.platform}</h4>
                          <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                            {post.status}
                          </Badge>
                        </div>
                        <p className="text-sm mb-3">{post.content}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{post.scheduled}</span>
                          </span>
                          {post.status === 'published' && (
                            <>
                              <span>{post.likes} likes</span>
                              <span>{post.comments} comments</span>
                              <span>{post.shares} shares</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => {
                        setPostContent(post.content)
                        toast.info(`Editing post: ${post.content.substring(0, 30)}...`)
                      }}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => {
                        if (window.confirm('Are you sure you want to delete this post?')) {
                          toast.success('Post deleted')
                          refetch()
                        }
                      }}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create New Post */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Post</CardTitle>
          <CardDescription>Schedule content across platforms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Platforms</label>
            <div className="flex space-x-3">
              {['Facebook', 'Twitter', 'Instagram', 'LinkedIn'].map((platform) => {
                const Icon = platformIcons[platform as keyof typeof platformIcons];
                return (
                  <label key={platform} className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    <Icon className={`h-5 w-5 ${platformColors[platform as keyof typeof platformColors]}`} />
                    <span className="text-sm">{platform}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Post Content</label>
            <textarea
              rows={4}
              placeholder="What's on your mind?"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-muted-foreground mt-1">{postContent.length} / 280 characters</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Schedule Date</label>
              <input type="date" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Schedule Time</label>
              <input type="time" className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Add Media (Optional)</label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop images/videos
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button disabled title="Social media integration coming soon">Schedule Post</Button>
            <Button variant="outline" disabled>Save Draft</Button>
            <Button variant="outline" disabled>Post Now</Button>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Performance</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { platform: 'Facebook', posts: 0, engagement: 0, reach: 0, growth: '—' },
              { platform: 'Twitter', posts: 0, engagement: 0, reach: 0, growth: '—' },
              { platform: 'Instagram', posts: 0, engagement: 0, reach: 0, growth: '—' },
              { platform: 'LinkedIn', posts: 0, engagement: 0, reach: 0, growth: '—' },
            ].map((stat) => {
              const Icon = platformIcons[stat.platform as keyof typeof platformIcons];
              return (
                <div key={stat.platform} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-6 w-6 ${platformColors[stat.platform as keyof typeof platformColors]}`} />
                    <div>
                      <h4 className="font-semibold">{stat.platform}</h4>
                      <p className="text-xs text-muted-foreground">{stat.posts} posts</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold">{stat.engagement.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Engagement</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{stat.reach.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Reach</p>
                    </div>
                    <Badge variant="secondary">{stat.growth}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Best Times to Post */}
      <Card>
        <CardHeader>
          <CardTitle>Best Times to Post</CardTitle>
          <CardDescription>Optimal posting schedule based on engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { platform: 'Facebook', bestTimes: ['10:00 AM', '2:00 PM', '7:00 PM'] },
              { platform: 'Twitter', bestTimes: ['9:00 AM', '12:00 PM', '5:00 PM'] },
              { platform: 'Instagram', bestTimes: ['11:00 AM', '3:00 PM', '8:00 PM'] },
              { platform: 'LinkedIn', bestTimes: ['8:00 AM', '12:00 PM', '5:00 PM'] },
            ].map((timing) => {
              const Icon = platformIcons[timing.platform as keyof typeof platformIcons];
              return (
                <div key={timing.platform} className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <Icon className={`h-5 w-5 ${platformColors[timing.platform as keyof typeof platformColors]}`} />
                    <h4 className="font-semibold">{timing.platform}</h4>
                  </div>
                  <div className="flex space-x-2">
                    {timing.bestTimes.map((time) => (
                      <Badge key={time} variant="outline">
                        {time}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
};

export default SocialMediaDashboard;
