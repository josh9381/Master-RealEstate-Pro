import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, CheckCircle, RefreshCw, Brain, Target, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { aiApi, tasksApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import intelligenceService, { type DashboardInsights, type ScoringModel } from '@/services/intelligenceService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const IntelligenceInsights = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
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
  const [dashboardInsights, setDashboardInsights] = useState<DashboardInsights | null>(null)
  const [scoringModel, setScoringModel] = useState<ScoringModel | null>(null)
  const [trendsData, setTrendsData] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      await loadInsights()
    }
    fetchData()
  }, [])

  const loadInsights = async () => {
    setLoading(true)
    try {
      // Load both old and new insights
      const [oldInsights, newDashboard, model, trends] = await Promise.all([
        aiApi.getInsights(),
        intelligenceService.getDashboardInsights(),
        intelligenceService.getScoringModel(),
        intelligenceService.getAnalyticsTrends(30),
      ])
      
      if (oldInsights?.data && Array.isArray(oldInsights.data)) {
        setInsights(oldInsights.data)
      }
      
      setDashboardInsights(newDashboard)
      setScoringModel(model)
      setTrendsData(trends)
    } catch (error) {
      const err = error as Error
      toast.error(err.message || 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }
  
  const handleOptimizeScoring = async () => {
    setOptimizing(true)
    try {
      const result = await intelligenceService.optimizeScoring()
      toast.success(`Scoring optimized! New accuracy: ${result.accuracy.toFixed(1)}%`)
      await loadInsights() // Reload to get updated model
    } catch (error) {
      const err = error as Error
      toast.error(err.message || 'Failed to optimize scoring')
    } finally {
      setOptimizing(false)
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

  const handleTakeAction = async (insight: typeof insights[0]) => {
    const category = (insight.category || '').toLowerCase()
    const action = (insight.action || '').toLowerCase()

    try {
      if (category === 'optimization' || action.includes('optim') || action.includes('improv')) {
        handleOptimizeScoring()
      } else if (category === 'risk' || action.includes('risk') || action.includes('address')) {
        // Create a task to address at-risk leads
        await tasksApi.createTask({
          title: `Address at-risk leads: ${insight.title}`,
          description: insight.description || `AI Insight: ${insight.action}`,
          priority: 'high',
          status: 'pending',
        })
        toast.success('Task created to address at-risk leads')
        navigate('/tasks')
      } else if (category === 'opportunity' || action.includes('follow up') || action.includes('lead')) {
        // Create a follow-up task for opportunity
        await tasksApi.createTask({
          title: `Follow up on opportunity: ${insight.title}`,
          description: insight.description || `AI Insight: ${insight.action}`,
          priority: 'medium',
          status: 'pending',
        })
        toast.success('Follow-up task created')
        navigate('/tasks')
      } else if (action.includes('campaign') || action.includes('email')) {
        navigate('/campaigns/create')
        toast.info('Navigating to create campaign')
      } else if (action.includes('task') || action.includes('schedule')) {
        await tasksApi.createTask({
          title: insight.title || 'AI-recommended action',
          description: insight.description || `AI Insight: ${insight.action}`,
          priority: 'medium',
          status: 'pending',
        })
        toast.success('Task created from insight')
        navigate('/tasks')
      } else {
        navigate('/leads')
        toast.info(`Action: ${insight.action}`)
      }
    } catch (error) {
      toast.error('Failed to execute action. Please try again.')
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

      {/* ML Model Performance Card */}
      {scoringModel && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  ML Scoring Model
                </CardTitle>
                <CardDescription>Machine learning model performance and optimization</CardDescription>
              </div>
              <Button onClick={handleOptimizeScoring} disabled={optimizing} variant="outline">
                {optimizing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Target className="h-4 w-4 mr-2" />}
                {optimizing ? 'Optimizing...' : 'Optimize Model'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Model Accuracy</p>
                <div className="text-3xl font-bold text-primary">
                  {scoringModel.accuracy ? `${scoringModel.accuracy.toFixed(1)}%` : 'Not trained'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {scoringModel.accuracy && scoringModel.accuracy >= 90 ? 'Excellent' : 
                   scoringModel.accuracy && scoringModel.accuracy >= 80 ? 'Good' : 
                   scoringModel.accuracy && scoringModel.accuracy >= 70 ? 'Fair' : 'Needs training'}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Training Data</p>
                <div className="text-3xl font-bold">{scoringModel.trainingDataCount}</div>
                <p className="text-xs text-muted-foreground">Conversion outcomes</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Last Optimized</p>
                <div className="text-sm font-medium">
                  {scoringModel.lastTrainedAt 
                    ? new Date(scoringModel.lastTrainedAt).toLocaleDateString()
                    : 'Never'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {scoringModel.lastTrainedAt ? 'Auto-optimizes weekly' : 'Needs 20+ conversions'}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Model Weights</p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Score:</span>
                    <span className="font-medium">{(scoringModel.factors.scoreWeight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Activity:</span>
                    <span className="font-medium">{(scoringModel.factors.activityWeight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recency:</span>
                    <span className="font-medium">{(scoringModel.factors.recencyWeight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Funnel Time:</span>
                    <span className="font-medium">{(scoringModel.factors.funnelTimeWeight * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Insights - Top Opportunities */}
      {dashboardInsights && dashboardInsights.topOpportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Top Opportunities
            </CardTitle>
            <CardDescription>Leads with highest conversion probability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardInsights.topOpportunities.map((opp) => (
                <div key={opp.leadId} className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 transition-colors">
                  <div>
                    <p className="font-medium">{opp.leadName}</p>
                    <p className="text-sm text-muted-foreground">Lead ID: {opp.leadId.slice(0, 8)}...</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="success" className="mb-1">
                      {opp.probability}% probability
                    </Badge>
                    <p className="text-sm font-medium">${opp.value.toLocaleString()} est. value</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversion Trends Chart */}
      {trendsData && trendsData.conversionTrend && (
        <Card>
          <CardHeader>
            <CardTitle>Conversion Probability Trends</CardTitle>
            <CardDescription>Average conversion probability over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendsData.conversionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgProbability" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Avg Probability (%)"
                />
                <Line 
                  type="monotone" 
                  dataKey="conversions" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Conversions"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Act on insights immediately</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button variant="outline" className="justify-start" onClick={() => navigate('/leads')}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Follow Up Leads
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => navigate('/leads')}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Address Risks
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={handleOptimizeScoring}
              disabled={optimizing}
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              {optimizing ? 'Optimizing...' : 'Apply Optimizations'}
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => navigate('/analytics')}>
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
          const Icon = categoryIcons[insight.category as keyof typeof categoryIcons] || Sparkles;
          const colorClass = categoryColors[insight.category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-600';

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
                        <Button size="sm" onClick={() => handleTakeAction(insight)}>Take Action</Button>
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
