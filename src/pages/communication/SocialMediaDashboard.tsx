import { Facebook, Twitter, Instagram, Linkedin, Send, Calendar, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const SocialMediaDashboard = () => {
  const socialPosts = [
    {
      id: 1,
      platform: 'Facebook',
      content: 'Check out our latest product launch! 🚀',
      scheduled: '2024-01-20 10:00 AM',
      status: 'scheduled',
      likes: 0,
      comments: 0,
      shares: 0,
    },
    {
      id: 2,
      platform: 'Twitter',
      content: 'Excited to announce our partnership with...',
      scheduled: '2024-01-18 14:30 PM',
      status: 'published',
      likes: 234,
      comments: 45,
      shares: 67,
    },
    {
      id: 3,
      platform: 'LinkedIn',
      content: 'Join our webinar next week on digital marketing trends',
      scheduled: '2024-01-17 09:00 AM',
      status: 'published',
      likes: 156,
      comments: 23,
      shares: 89,
    },
  ];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Social Media Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage and schedule posts across all platforms
          </p>
        </div>
        <Button>
          <Send className="h-4 w-4 mr-2" />
          Create Post
        </Button>
      </div>

      {/* Platform Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">145</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23.5K</div>
            <p className="text-xs text-muted-foreground">+18.2% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Reach</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.9K</div>
            <p className="text-xs text-muted-foreground">Per post</p>
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
              { name: 'Facebook', followers: '12.5K', status: 'connected' },
              { name: 'Twitter', followers: '8.9K', status: 'connected' },
              { name: 'Instagram', followers: '15.2K', status: 'connected' },
              { name: 'LinkedIn', followers: '5.4K', status: 'disconnected' },
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
                  <Button variant="outline" size="sm" className="mt-3 w-full">
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
              <Button variant="outline" size="sm">
                Scheduled
              </Button>
              <Button variant="outline" size="sm">
                Published
              </Button>
              <Button variant="outline" size="sm">
                All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {socialPosts.map((post) => {
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
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm">
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
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-muted-foreground mt-1">0 / 280 characters</p>
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
            <Button>Schedule Post</Button>
            <Button variant="outline">Save Draft</Button>
            <Button variant="outline">Post Now</Button>
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
              { platform: 'Facebook', posts: 45, engagement: 8900, reach: 125000, growth: '+12%' },
              { platform: 'Twitter', posts: 67, engagement: 5600, reach: 89000, growth: '+8%' },
              { platform: 'Instagram', posts: 23, engagement: 12300, reach: 152000, growth: '+24%' },
              { platform: 'LinkedIn', posts: 10, engagement: 2100, reach: 34000, growth: '+5%' },
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
    </div>
  );
};

export default SocialMediaDashboard;
