import { Link } from 'react-router-dom';
import { Brain, Target, Users, TrendingUp, Sparkles, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const AIHub = () => {
  const aiFeatures = [
    {
      id: 1,
      title: 'Lead Scoring',
      description: 'AI-powered lead quality prediction',
      icon: Target,
      path: '/ai/lead-scoring',
      status: 'active',
      accuracy: '94%',
      leadsScored: 1247,
    },
    {
      id: 2,
      title: 'Customer Segmentation',
      description: 'Intelligent customer grouping',
      icon: Users,
      path: '/ai/segmentation',
      status: 'active',
      accuracy: '89%',
      segments: 12,
    },
    {
      id: 3,
      title: 'Predictive Analytics',
      description: 'Forecast outcomes and trends',
      icon: TrendingUp,
      path: '/ai/predictive',
      status: 'training',
      accuracy: '91%',
      predictions: 856,
    },
    {
      id: 4,
      title: 'Model Training',
      description: 'Train and optimize AI models',
      icon: Brain,
      path: '/ai/training',
      status: 'active',
      accuracy: '87%',
      models: 5,
    },
    {
      id: 5,
      title: 'Intelligence Insights',
      description: 'Automated business insights',
      icon: Sparkles,
      path: '/ai/insights',
      status: 'active',
      insights: 23,
    },
    {
      id: 6,
      title: 'Performance Analytics',
      description: 'AI model performance metrics',
      icon: BarChart3,
      path: '/ai/analytics',
      status: 'active',
      accuracy: '92%',
    },
  ];

  const recentInsights = [
    {
      id: 1,
      type: 'opportunity',
      title: 'High-value leads detected',
      description: '12 leads have >80% conversion probability',
      priority: 'high',
      date: '2 hours ago',
    },
    {
      id: 2,
      type: 'warning',
      title: 'Engagement dropping',
      description: 'Email open rates down 15% this week',
      priority: 'medium',
      date: '5 hours ago',
    },
    {
      id: 3,
      type: 'success',
      title: 'Model accuracy improved',
      description: 'Lead scoring model now at 94% accuracy',
      priority: 'low',
      date: '1 day ago',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Hub</h1>
        <p className="text-muted-foreground mt-2">
          Leverage artificial intelligence to optimize your sales and marketing
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6</div>
            <p className="text-xs text-muted-foreground">+2 in training</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">91.2%</div>
            <p className="text-xs text-muted-foreground">+2.3% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Predictions Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,547</div>
            <p className="text-xs text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Insights</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">3 high priority</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Features Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">AI Features</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {aiFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <Badge
                          variant={
                            feature.status === 'active'
                              ? 'success'
                              : feature.status === 'training'
                              ? 'warning'
                              : 'secondary'
                          }
                          className="mt-1"
                        >
                          {feature.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {feature.accuracy && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Accuracy:</span>
                        <span className="font-medium">{feature.accuracy}</span>
                      </div>
                    )}
                    {feature.leadsScored && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Leads Scored:</span>
                        <span className="font-medium">{feature.leadsScored}</span>
                      </div>
                    )}
                    {feature.segments && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Segments:</span>
                        <span className="font-medium">{feature.segments}</span>
                      </div>
                    )}
                    {feature.predictions && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Predictions:</span>
                        <span className="font-medium">{feature.predictions}</span>
                      </div>
                    )}
                    {feature.models && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Models:</span>
                        <span className="font-medium">{feature.models}</span>
                      </div>
                    )}
                    {feature.insights && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Insights:</span>
                        <span className="font-medium">{feature.insights}</span>
                      </div>
                    )}
                    <Link to={feature.path}>
                      <Button className="w-full mt-2" variant="outline">
                        Open
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Recent AI Insights</CardTitle>
          <CardDescription>Automated insights from your AI models</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentInsights.map((insight) => (
              <div key={insight.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                <div
                  className={`p-2 rounded-lg ${
                    insight.type === 'opportunity'
                      ? 'bg-green-100 text-green-600'
                      : insight.type === 'warning'
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                    </div>
                    <Badge
                      variant={
                        insight.priority === 'high'
                          ? 'destructive'
                          : insight.priority === 'medium'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {insight.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{insight.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIHub;
