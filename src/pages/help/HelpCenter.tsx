import { useState } from 'react'
import { Book, Video, MessageCircle, Search, Keyboard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { KeyboardShortcutsModal } from '@/components/help/KeyboardShortcutsModal';

const HelpCenter = () => {
  const [showShortcuts, setShowShortcuts] = useState(false)
  const categories = [
    {
      title: 'Getting Started',
      description: 'Learn the basics of using the platform',
      articles: 12,
      icon: Book,
    },
    {
      title: 'Campaigns',
      description: 'Create and manage marketing campaigns',
      articles: 24,
      icon: Book,
    },
    {
      title: 'Lead Management',
      description: 'Organize and track your leads',
      articles: 18,
      icon: Book,
    },
    {
      title: 'Analytics & Reports',
      description: 'Understand your data and metrics',
      articles: 15,
      icon: Book,
    },
    {
      title: 'Integrations',
      description: 'Connect external tools and services',
      articles: 20,
      icon: Book,
    },
    {
      title: 'Account & Billing',
      description: 'Manage your account and subscription',
      articles: 10,
      icon: Book,
    },
  ];

  const popularArticles = [
    'How to create your first email campaign',
    'Understanding lead scoring',
    'Setting up integrations with Salesforce',
    'Best practices for email marketing',
    'How to import leads from CSV',
    'Creating automated workflows',
  ];

  const videos = [
    {
      title: 'Platform Overview',
      duration: '5:32',
      views: 1247,
    },
    {
      title: 'Creating Your First Campaign',
      duration: '8:15',
      views: 892,
    },
    {
      title: 'Advanced Lead Scoring',
      duration: '12:45',
      views: 634,
    },
    {
      title: 'Workflow Automation Tutorial',
      duration: '15:20',
      views: 521,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Help Center</h1>
        <p className="text-muted-foreground mt-2">
          Find answers, tutorials, and documentation
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search for help..." className="pl-10" />
            </div>
            <Button>Search</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-sm text-muted-foreground">Popular searches:</span>
            {['campaigns', 'leads', 'integrations', 'billing'].map((tag, index) => (
              <Button key={index} variant="ghost" size="sm">
                {tag}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <Book className="h-8 w-8 mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Documentation</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Comprehensive guides and API docs
            </p>
            <Button variant="outline" size="sm">
              Browse Docs
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <Video className="h-8 w-8 mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Video Tutorials</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Step-by-step video walkthroughs
            </p>
            <Button variant="outline" size="sm">
              Watch Videos
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <MessageCircle className="h-8 w-8 mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Contact Support</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get help from our support team
            </p>
            <Button variant="outline" size="sm">
              Open Ticket
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowShortcuts(true)}>
          <CardContent className="pt-6">
            <Keyboard className="h-8 w-8 mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Keyboard Shortcuts</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Learn shortcuts to work faster
            </p>
            <Button variant="outline" size="sm">
              View Shortcuts
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Help Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Browse by Category</CardTitle>
          <CardDescription>Find articles organized by topic</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div
                  key={index}
                  className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{category.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {category.articles} articles
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Popular Articles */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Articles</CardTitle>
          <CardDescription>Most viewed help articles this week</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {popularArticles.map((article, index) => (
              <li
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Book className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{article}</span>
                </div>
                <Button variant="ghost" size="sm">
                  Read
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Video Tutorials */}
      <Card>
        <CardHeader>
          <CardTitle>Video Tutorials</CardTitle>
          <CardDescription>Learn visually with our video guides</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {videos.map((video, index) => (
              <div
                key={index}
                className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Video className="h-12 w-12 text-primary" />
                </div>
                <div className="p-4">
                  <h4 className="font-medium mb-2 line-clamp-2">{video.title}</h4>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{video.duration}</span>
                    <span>{video.views} views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle>Still Need Help?</CardTitle>
          <CardDescription>Our support team is here to assist you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Average response time: 2 hours
              </p>
              <p className="text-sm text-muted-foreground">
                Support available: Monday-Friday, 9AM-6PM EST
              </p>
            </div>
            <Button>
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>

      <KeyboardShortcutsModal 
        isOpen={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
      />
    </div>
  );
};

export default HelpCenter;
