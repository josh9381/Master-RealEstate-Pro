import { Users, Plus, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const Segmentation = () => {
  const segments = [
    {
      id: 1,
      name: 'High-Value Prospects',
      description: 'Leads with high budget and engagement',
      members: 342,
      avgScore: 89,
      conversionRate: 34,
      color: 'bg-green-500',
      criteria: ['Score > 80', 'Budget > $10k', 'Email opens > 5'],
    },
    {
      id: 2,
      name: 'Engaged SMBs',
      description: 'Small to medium businesses showing interest',
      members: 567,
      avgScore: 72,
      conversionRate: 22,
      color: 'bg-blue-500',
      criteria: ['Company size: 10-100', 'Website visits > 3', 'Downloaded content'],
    },
    {
      id: 3,
      name: 'Enterprise Opportunities',
      description: 'Large companies in target industries',
      members: 128,
      avgScore: 76,
      conversionRate: 28,
      color: 'bg-purple-500',
      criteria: ['Company size > 1000', 'Industry: Tech/Finance', 'Decision maker role'],
    },
    {
      id: 4,
      name: 'Re-engagement Needed',
      description: 'Previously active leads that went cold',
      members: 234,
      avgScore: 54,
      conversionRate: 12,
      color: 'bg-yellow-500',
      criteria: ['Last activity > 30 days', 'Previous score > 70', 'No email response'],
    },
    {
      id: 5,
      name: 'Trial Users',
      description: 'Signed up for trial but not converted',
      members: 445,
      avgScore: 68,
      conversionRate: 18,
      color: 'bg-orange-500',
      criteria: ['Trial active', 'Usage > 50%', 'Not yet paid'],
    },
    {
      id: 6,
      name: 'Product-Qualified Leads',
      description: 'High product usage indicating buying intent',
      members: 189,
      avgScore: 82,
      conversionRate: 42,
      color: 'bg-indigo-500',
      criteria: ['Feature usage > 80%', 'Power user actions', 'Invited team members'],
    },
  ];

  const segmentInsights = [
    {
      title: 'Top Performing Segment',
      value: 'Product-Qualified Leads',
      metric: '42% conversion rate',
      change: '+5%',
    },
    {
      title: 'Fastest Growing',
      value: 'Engaged SMBs',
      metric: '+89 members this week',
      change: '+16%',
    },
    {
      title: 'Needs Attention',
      value: 'Re-engagement Needed',
      metric: '234 cold leads',
      change: '-8%',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Segmentation</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered intelligent customer grouping and targeting
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Refine Segments
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Segment
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Segments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">6 active campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,905</div>
            <p className="text-xs text-muted-foreground">Across all segments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Conversion</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">26%</div>
            <p className="text-xs text-muted-foreground">+4% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89%</div>
            <p className="text-xs text-muted-foreground">Segmentation accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Segment Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        {segmentInsights.map((insight, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {insight.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{insight.value}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-muted-foreground">{insight.metric}</p>
                <Badge
                  variant={insight.change.startsWith('+') ? 'success' : 'destructive'}
                >
                  {insight.change}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Segments Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Active Segments</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment) => (
            <Card key={segment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${segment.color}`} />
                    <div>
                      <CardTitle className="text-lg">{segment.name}</CardTitle>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>{segment.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Members:</span>
                    <span className="font-semibold">{segment.members}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg Score:</span>
                    <Badge variant={segment.avgScore >= 80 ? 'success' : 'warning'}>
                      {segment.avgScore}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Conversion:</span>
                    <span className="font-semibold">{segment.conversionRate}%</span>
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Criteria:</p>
                    <div className="flex flex-wrap gap-1">
                      {segment.criteria.map((criterion, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {criterion}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      View
                    </Button>
                    <Button variant="default" size="sm" className="flex-1">
                      Campaign
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Segmentation;
