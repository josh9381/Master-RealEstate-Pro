import { Book, FileText, Video, Search, ChevronRight, Star, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const DocumentationPages = () => {
  const categories = [
    {
      name: 'Getting Started',
      icon: '🚀',
      articles: 12,
      description: 'Quick start guides and onboarding',
    },
    {
      name: 'Features & Tools',
      icon: '🔧',
      articles: 45,
      description: 'Learn about all platform capabilities',
    },
    {
      name: 'Integration Guides',
      icon: '🔌',
      articles: 23,
      description: 'Connect with third-party services',
    },
    {
      name: 'API Reference',
      icon: '💻',
      articles: 67,
      description: 'Developer documentation and endpoints',
    },
    {
      name: 'Best Practices',
      icon: '⭐',
      articles: 18,
      description: 'Tips and recommendations',
    },
    {
      name: 'Troubleshooting',
      icon: '🔍',
      articles: 34,
      description: 'Common issues and solutions',
    },
  ];

  const popularArticles = [
    {
      title: 'Getting Started with CRM Platform',
      category: 'Getting Started',
      views: 15420,
      readTime: '5 min',
      rating: 4.8,
      updated: '2 days ago',
    },
    {
      title: 'Creating Your First Email Campaign',
      category: 'Features & Tools',
      views: 12380,
      readTime: '8 min',
      rating: 4.9,
      updated: '1 week ago',
    },
    {
      title: 'Lead Scoring Best Practices',
      category: 'Best Practices',
      views: 9250,
      readTime: '12 min',
      rating: 4.7,
      updated: '3 days ago',
    },
    {
      title: 'REST API Authentication',
      category: 'API Reference',
      views: 8640,
      readTime: '6 min',
      rating: 4.6,
      updated: '1 day ago',
    },
    {
      title: 'Salesforce Integration Setup',
      category: 'Integration Guides',
      views: 7890,
      readTime: '10 min',
      rating: 4.8,
      updated: '5 days ago',
    },
    {
      title: 'Email Deliverability Issues',
      category: 'Troubleshooting',
      views: 7320,
      readTime: '7 min',
      rating: 4.5,
      updated: '4 days ago',
    },
  ];

  const recentArticles = [
    {
      title: 'New Dashboard Features (v2.4)',
      category: 'Features & Tools',
      published: 'Jan 12, 2024',
      badge: 'New',
    },
    {
      title: 'Webhook Event Types Reference',
      category: 'API Reference',
      published: 'Jan 10, 2024',
      badge: 'Updated',
    },
    {
      title: 'Advanced Segmentation Guide',
      category: 'Best Practices',
      published: 'Jan 8, 2024',
      badge: 'New',
    },
  ];

  const quickLinks = [
    { title: 'System Status', url: '#', icon: '🟢' },
    { title: 'Changelog', url: '#', icon: '📝' },
    { title: 'API Status', url: '#', icon: '⚡' },
    { title: 'Security', url: '#', icon: '🔒' },
    { title: 'Privacy Policy', url: '#', icon: '📋' },
    { title: 'Terms of Service', url: '#', icon: '📜' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentation</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive guides and resources to help you succeed
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Video className="h-4 w-4 mr-2" />
            Video Tutorials
          </Button>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            PDF Guides
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search documentation..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg text-lg"
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-sm text-muted-foreground">Popular searches:</span>
            {['API authentication', 'Email campaigns', 'Lead import', 'Integrations'].map((term) => (
              <Button key={term} variant="outline" size="sm">
                {term}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">199</div>
            <p className="text-xs text-muted-foreground">Across all categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Video Tutorials</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">60</div>
            <p className="text-xs text-muted-foreground">4h 18m total content</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Today</div>
            <p className="text-xs text-muted-foreground">3 new articles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.7</div>
            <p className="text-xs text-muted-foreground">From 2,340 reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Browse by Category</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.name} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="text-3xl">{category.icon}</div>
                    <div>
                      <h3 className="font-semibold mb-1">{category.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{category.description}</p>
                      <p className="text-xs text-blue-600">{category.articles} articles</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Popular Articles */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Articles</CardTitle>
          <CardDescription>Most viewed documentation pages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {popularArticles.map((article, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{article.title}</h3>
                  <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                    <Badge variant="secondary">{article.category}</Badge>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {article.readTime}
                    </span>
                    <span className="flex items-center">
                      <Star className="h-3 w-3 mr-1 text-yellow-500" />
                      {article.rating}
                    </span>
                    <span>{article.views.toLocaleString()} views</span>
                    <span>Updated {article.updated}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Articles */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recently Added</CardTitle>
            <CardDescription>Latest documentation updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentArticles.map((article, index) => (
                <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-sm">{article.title}</h4>
                      <Badge
                        variant="secondary"
                        className={
                          article.badge === 'New'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }
                      >
                        {article.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{article.category}</p>
                    <p className="text-xs text-muted-foreground mt-1">{article.published}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Helpful resources and policies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2">
              {quickLinks.map((link, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <span className="text-xl">{link.icon}</span>
                  <span className="text-sm font-medium">{link.title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Featured Guides */}
      <Card>
        <CardHeader>
          <CardTitle>Featured Guides</CardTitle>
          <CardDescription>In-depth tutorials and walkthroughs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: 'Complete Lead Management Guide',
                description: 'Everything you need to know about managing leads effectively',
                chapters: 8,
                readTime: '45 min',
              },
              {
                title: 'Email Marketing Mastery',
                description: 'Build successful email campaigns from start to finish',
                chapters: 12,
                readTime: '60 min',
              },
              {
                title: 'Analytics & Reporting Deep Dive',
                description: 'Make data-driven decisions with powerful insights',
                chapters: 6,
                readTime: '35 min',
              },
              {
                title: 'Automation Workflows Handbook',
                description: 'Streamline your processes with intelligent automation',
                chapters: 10,
                readTime: '50 min',
              },
            ].map((guide, index) => (
              <div key={index} className="p-4 border rounded-lg hover:shadow-lg cursor-pointer transition-shadow">
                <h3 className="font-semibold mb-2">{guide.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{guide.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center">
                      <Book className="h-3 w-3 mr-1" />
                      {guide.chapters} chapters
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {guide.readTime}
                    </span>
                  </div>
                  <Button variant="outline" size="sm">
                    Start Reading
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Help & Support */}
      <Card className="border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Book className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-2">Cannot find what you are looking for?</h4>
              <p className="text-sm text-blue-800 mb-4">
                Our support team is here to help. Contact us via chat, email, or phone for personalized assistance.
              </p>
              <div className="flex space-x-3">
                <Button size="sm">Contact Support</Button>
                <Button size="sm" variant="outline">
                  Community Forum
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Improve Our Documentation</CardTitle>
          <CardDescription>Your feedback helps us create better content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <p className="text-sm">Was this documentation helpful?</p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                👍 Yes
              </Button>
              <Button variant="outline" size="sm">
                👎 No
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentationPages;
