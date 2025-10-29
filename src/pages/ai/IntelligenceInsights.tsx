import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, CheckCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { aiApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

const IntelligenceInsights = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<Array<{
    id: string | number;
    category: string;
    priority: string;
    title: string;
    description: string;
    impact: string;
    action: string;
    confidence: number;
    created: string;
  }>>([])

  useEffect(() => {
    const fetchData = async () => {
      await loadInsights()
    }
    fetchData()
  }, [])

  const loadInsights = async () => {
    setLoading(true)
    try {
      const data = await aiApi.getInsights()
      if (data?.insights) {
        setInsights(data.insights)
      }
    } catch (error) {
      const err = error as Error
      toast.error(err.message || 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }

  const handleDismissInsight = async (insightId: string | number) => {
    try {
      await aiApi.dismissInsight(insightId.toString())
      toast.success('Insight dismissed')
      setInsights(prev => prev.filter(i => i.id !== insightId))
    } catch (error) {
      const err = error as Error
      toast.error(err.message || 'Failed to dismiss insight')
    }
  }

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
        <Button onClick={loadInsights} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {loading ? 'Loading...' : 'Refresh Insights'}
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
            <div className="text-2xl font-bold">{insights.length}</div>
            <p className="text-xs text-muted-foreground">Active insights</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.filter(i => i.priority === 'high').length}</div>
            <p className="text-xs text-muted-foreground">Require immediate action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(insights.map(i => i.category)).size}</div>
            <p className="text-xs text-muted-foreground">Different types</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {insights.length > 0 ? Math.round(insights.reduce((acc, i) => acc + i.confidence, 0) / insights.length) : 0}%
            </div>
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
                        <Button variant="outline" size="sm" onClick={() => handleDismissInsight(insight.id)}>
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
