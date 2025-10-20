import { FileText, Video, Book, ExternalLink, Search, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const VideoTutorialLibrary = () => {
  const categories = [
    { name: 'Getting Started', count: 12, duration: '45 min' },
    { name: 'Lead Management', count: 8, duration: '32 min' },
    { name: 'Campaigns', count: 15, duration: '67 min' },
    { name: 'Analytics & Reports', count: 10, duration: '48 min' },
    { name: 'Automation', count: 6, duration: '28 min' },
    { name: 'Integrations', count: 9, duration: '38 min' },
  ];

  const featuredVideos = [
    {
      id: 1,
      title: 'Quick Start Guide',
      description: 'Get up and running in 10 minutes',
      duration: '10:23',
      views: 12500,
      category: 'Getting Started',
      difficulty: 'Beginner',
      thumbnail: '🎬',
    },
    {
      id: 2,
      title: 'Creating Your First Campaign',
      description: 'Step-by-step campaign creation tutorial',
      duration: '15:45',
      views: 8900,
      category: 'Campaigns',
      difficulty: 'Beginner',
      thumbnail: '🎬',
    },
    {
      id: 3,
      title: 'Advanced Lead Scoring',
      description: 'Implement intelligent lead scoring strategies',
      duration: '22:15',
      views: 5600,
      category: 'Lead Management',
      difficulty: 'Advanced',
      thumbnail: '🎬',
    },
    {
      id: 4,
      title: 'Building Custom Reports',
      description: 'Create powerful custom reports and dashboards',
      duration: '18:30',
      views: 7200,
      category: 'Analytics & Reports',
      difficulty: 'Intermediate',
      thumbnail: '🎬',
    },
    {
      id: 5,
      title: 'Workflow Automation',
      description: 'Automate your sales processes',
      duration: '25:10',
      views: 6400,
      category: 'Automation',
      difficulty: 'Advanced',
      thumbnail: '🎬',
    },
    {
      id: 6,
      title: 'API Integration Guide',
      description: 'Connect external services using our API',
      duration: '20:45',
      views: 4800,
      category: 'Integrations',
      difficulty: 'Advanced',
      thumbnail: '🎬',
    },
  ];

  const recentlyWatched = [
    { title: 'Managing Contact Lists', duration: '12:30', progress: 75, category: 'Lead Management' },
    { title: 'Email Template Design', duration: '16:20', progress: 45, category: 'Campaigns' },
    { title: 'Dashboard Customization', duration: '14:15', progress: 100, category: 'Analytics & Reports' },
  ];

  const playlists = [
    {
      name: 'Onboarding Series',
      videoCount: 8,
      totalDuration: '1h 24m',
      description: 'Complete guide for new users',
    },
    {
      name: 'Marketing Mastery',
      videoCount: 12,
      totalDuration: '2h 15m',
      description: 'Advanced marketing techniques',
    },
    {
      name: 'Sales Automation',
      videoCount: 6,
      totalDuration: '58m',
      description: 'Automate your sales workflow',
    },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-green-100 text-green-800';
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'Advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Video Tutorial Library</h1>
          <p className="text-muted-foreground mt-2">
            Learn at your own pace with our comprehensive video guides
          </p>
        </div>
        <Button>
          <ExternalLink className="h-4 w-4 mr-2" />
          YouTube Channel
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tutorials..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">60</div>
            <p className="text-xs text-muted-foreground">Across 6 categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4h 18m</div>
            <p className="text-xs text-muted-foreground">Of video content</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Watched</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Videos completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Playlists</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Curated collections</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Browse by Category</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.name} className="cursor-pointer hover:border-blue-500 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {category.count} videos • {category.duration}
                    </p>
                  </div>
                  <Video className="h-6 w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Featured Videos */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Featured Tutorials</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {featuredVideos.map((video) => (
            <Card key={video.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex space-x-4">
                  {/* Thumbnail */}
                  <div className="w-32 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-4xl flex-shrink-0">
                    {video.thumbnail}
                  </div>
                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{video.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{video.description}</p>
                    <div className="flex items-center space-x-2 text-xs">
                      <Badge variant="secondary" className={getDifficultyColor(video.difficulty)}>
                        {video.difficulty}
                      </Badge>
                      <span className="text-muted-foreground">{video.duration}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{video.views.toLocaleString()} views</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recently Watched */}
      <Card>
        <CardHeader>
          <CardTitle>Continue Watching</CardTitle>
          <CardDescription>Pick up where you left off</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentlyWatched.map((video, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-24 h-16 bg-gray-200 rounded flex items-center justify-center text-2xl flex-shrink-0">
                  🎬
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{video.title}</h4>
                  <p className="text-sm text-muted-foreground">{video.category}</p>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{video.progress}% complete</span>
                      <span>{video.duration}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${video.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  {video.progress === 100 ? 'Rewatch' : 'Continue'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Playlists */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Curated Playlists</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {playlists.map((playlist) => (
            <Card key={playlist.name} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{playlist.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{playlist.description}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Video className="h-3 w-3" />
                      <span>{playlist.videoCount} videos</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{playlist.totalDuration}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Learning Paths */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Learning Paths</CardTitle>
          <CardDescription>Structured courses based on your role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                title: 'Sales Representative',
                videos: 15,
                duration: '2h 30m',
                description: 'Master lead management and campaign execution',
              },
              {
                title: 'Marketing Manager',
                videos: 18,
                duration: '3h 15m',
                description: 'Learn advanced analytics and automation',
              },
              {
                title: 'Administrator',
                videos: 12,
                duration: '1h 45m',
                description: 'System configuration and user management',
              },
            ].map((path, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Book className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{path.title}</h3>
                    <p className="text-sm text-muted-foreground">{path.description}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                      <Video className="h-3 w-3" />
                      <span>{path.videos} videos</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{path.duration}</span>
                    </div>
                  </div>
                </div>
                <Button>Start Learning</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoTutorialLibrary;
