import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const IntelligenceInsights = () => {
  const insights = [
    {
      id: 1,
      category: 'Opportunity',
      priority: 'high',
      title: 'High-Value Leads Ready to Convert',
      description: '18 leads with >85% conversion probability have been inactive for 5+ days',
      impact: 'Potential revenue: $245,000',
      action: 'Schedule follow-up calls',
      confidence: 94,
      created: '2 hours ago',
    },
    {
      id: 2,
      category: 'Risk',
      priority: 'high',
      title: 'Email Engagement Dropping',
      description: 'Open rates down 22% week-over-week across all campaigns',
      impact: '340 fewer opens than expected',
      action: 'Review subject lines and send times',
      confidence: 89,
      created: '5 hours ago',
    },
    {
      id: 3,
      category: 'Optimization',
      priority: 'medium',
      title: 'Best Time to Send Emails',
      description: 'Tuesday 10 AM shows 35% higher open rates than current schedule',
      impact: '+120 expected opens per campaign',
      action: 'Adjust campaign timing',
      confidence: 87,
      created: '1 day ago',
    },
    {
      id: 4,
      category: 'Trend',
      priority: 'medium',
      title: 'Industry Shift Detected',
      description: 'SaaS leads showing 45% increase in engagement over last 30 days',
      impact: 'Opportunity to increase targeting',
      action: 'Create SaaS-specific campaign',
      confidence: 82,
      created: '1 day ago',
    },
    {
      id: 5,
      category: 'Opportunity',
      priority: 'low',
      title: 'Cross-Sell Potential',
      description: '67 customers using Feature A might benefit from Feature B',
      impact: 'Estimated $45,000 upsell opportunity',
      action: 'Send targeted product emails',
      confidence: 76,
      created: '2 days ago',
    },
    {
      id: 6,
      category: 'Risk',
      priority: 'medium',
      title: 'Churn Risk Detected',
      description: '12 customers with declining usage patterns over 45 days',
      impact: '$89,000 revenue at risk',
      action: 'Initiate retention campaign',
      confidence: 91,
      created: '3 days ago',
    },
  ];

  const categoryIcons = {
    Opportunity: TrendingUp,
    Risk: AlertTriangle,
    Optimization: Lightbulb,
    Trend: Sparkles,
  };

  const categoryColors = {
    Opportunity: 'bg-green-100 text-green-600',
    Risk: 'bg-red-100 text-red-600',
    Optimization: 'bg-blue-100 text-blue-600',
    Trend: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Intelligence Insights</h1>
          <p className="text-muted-foreground mt-2">
            AI-generated insights and recommendations for your business
          </p>
        </div>
        <Button>
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Insights
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Insights</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">+7 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Require immediate action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions Taken</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">86%</div>
            <p className="text-xs text-muted-foreground">Across all insights</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Act on insights immediately</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button variant="outline" className="justify-start">
              <TrendingUp className="h-4 w-4 mr-2" />
              Follow Up Leads
            </Button>
            <Button variant="outline" className="justify-start">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Address Risks
            </Button>
            <Button variant="outline" className="justify-start">
              <Lightbulb className="h-4 w-4 mr-2" />
              Apply Optimizations
            </Button>
            <Button variant="outline" className="justify-start">
              <Sparkles className="h-4 w-4 mr-2" />
              View All Trends
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Insights List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">All Insights</h2>
        {insights.map((insight) => {
          const Icon = categoryIcons[insight.category as keyof typeof categoryIcons];
          const colorClass = categoryColors[insight.category as keyof typeof categoryColors];

          return (
            <Card key={insight.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${colorClass}`}>
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant="outline">{insight.category}</Badge>
                          <Badge
                            variant={
                              insight.priority === 'high'
                                ? 'destructive'
                                : insight.priority === 'medium'
                                ? 'warning'
                                : 'secondary'
                            }
                          >
                            {insight.priority} priority
                          </Badge>
                          <span className="text-xs text-muted-foreground">{insight.created}</span>
                        </div>
                        <h3 className="text-lg font-semibold">{insight.title}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className="text-2xl font-bold">{insight.confidence}%</p>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>

                    <div className="bg-secondary/50 rounded-lg p-3 mb-3">
                      <p className="text-sm">
                        <span className="font-medium">Impact:</span> {insight.impact}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Lightbulb className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Recommended: {insight.action}</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          Dismiss
                        </Button>
                        <Button size="sm">Take Action</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default IntelligenceInsights;
