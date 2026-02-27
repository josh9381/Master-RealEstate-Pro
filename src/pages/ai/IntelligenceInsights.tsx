import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, CheckCircle, RefreshCw, Brain, Target, Zap, Search, ArrowLeft, Filter, ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { aiApi, tasksApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import intelligenceService, { type DashboardInsights, type ScoringModel } from '@/services/intelligenceService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type InsightsTab = 'active' | 'acted' | 'dismissed';

const IntelligenceInsights = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [optimizing, setOptimizing] = useState(false)
  const [activeTab, setActiveTab] = useState<InsightsTab>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('priority')
  const [showPreferences, setShowPreferences] = useState(false)
  const [insightPriorityThreshold, setInsightPriorityThreshold] = useState('all')
  const [insightTypes, setInsightTypes] = useState<string[]>(['lead_followup', 'scoring_accuracy', 'email_performance', 'pipeline_health'])
  const [digestFrequency, setDigestFrequency] = useState('daily')
  const [prefsDirty, setPrefsDirty] = useState(false)

  // Load insight preferences
  const { data: prefsData } = useQuery({
    queryKey: ['ai', 'preferences'],
    queryFn: () => aiApi.getPreferences(),
  })

  // Hydrate local state from loaded prefs (only once)
  const [prefsHydrated, setPrefsHydrated] = useState(false)
  if (prefsData?.data?.chatbot && !prefsHydrated) {
    const cb = prefsData.data.chatbot
    if (cb.insightPriorityThreshold) setInsightPriorityThreshold(cb.insightPriorityThreshold)
    if (cb.insightTypes && Array.isArray(cb.insightTypes)) setInsightTypes(cb.insightTypes)
    if (cb.aiInsightsFrequency) setDigestFrequency(cb.aiInsightsFrequency)
    setPrefsHydrated(true)
  }

  // Save insight preferences mutation
  const saveInsightPrefs = useMutation({
    mutationFn: () => aiApi.savePreferences({
      chatbot: {
        insightPriorityThreshold,
        insightTypes,
        aiInsightsFrequency: digestFrequency,
      },
    }),
    onSuccess: () => {
      toast.success('Insight preferences saved')
      setPrefsDirty(false)
      queryClient.invalidateQueries({ queryKey: ['ai', 'preferences'] })
    },
    onError: () => toast.error('Failed to save preferences'),
  })

  const { data: insightsData, isLoading: loading, refetch } = useQuery({
    queryKey: ['ai', 'intelligence-insights'],
    queryFn: async () => {
      const [oldInsights, allRecommendations, newDashboard, modelRaw, trends] = await Promise.all([
        aiApi.getInsights({ status: 'all', limit: 200 }),
        aiApi.getRecommendations({ limit: 50 }),
        intelligenceService.getDashboardInsights(),
        intelligenceService.getScoringModel(),
        intelligenceService.getAnalyticsTrends(30),
      ])

      // Normalize scoring model from API response shape
      const md = (modelRaw as any)?.data ?? modelRaw
      const normalizedModel: ScoringModel | null = md ? {
        organizationId: md.organizationId ?? '',
        factors: md.factors ?? md.weights ?? md.defaultWeights ?? { scoreWeight: 0.4, activityWeight: 0.3, recencyWeight: 0.2, funnelTimeWeight: 0.1 },
        accuracy: md.accuracy ?? null,
        lastTrainedAt: md.lastTrainedAt ?? null,
        trainingDataCount: md.trainingDataCount ?? 0,
        createdAt: md.createdAt ?? '',
        updatedAt: md.updatedAt ?? '',
      } : null

      return {
        insights: (oldInsights?.data && Array.isArray(oldInsights.data)) ? oldInsights.data : [],
        recommendations: (allRecommendations?.data && Array.isArray(allRecommendations.data)) ? allRecommendations.data : [],
        dashboardInsights: newDashboard as DashboardInsights | null,
        scoringModel: normalizedModel,
        trendsData: trends,
      }
    },
  })

  const insights = insightsData?.insights ?? []
  const recommendations = insightsData?.recommendations ?? []
  const dashboardInsights = insightsData?.dashboardInsights ?? null
  const scoringModel = insightsData?.scoringModel ?? null
  const trendsData = insightsData?.trendsData ?? null

  // Mark insight as acted upon
  const actMutation = useMutation({
    mutationFn: ({ id, actionTaken }: { id: string; actionTaken?: string }) =>
      aiApi.actOnInsight(id, actionTaken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'intelligence-insights'] })
    },
  })
  
  const handleOptimizeScoring = async () => {
    setOptimizing(true)
    try {
      const result = await intelligenceService.optimizeScoring()
      toast.success(`Scoring optimized! New accuracy: ${result.accuracy.toFixed(1)}%`)
      await refetch() // Reload to get updated model
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
      queryClient.setQueryData(['ai', 'intelligence-insights'], (old: { insights?: Array<{ id: string | number }> } | undefined) => {
        if (!old) return old
        return { ...old, insights: old.insights?.filter((i: { id: string | number }) => i.id !== insightId) }
      })
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
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/ai')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Intelligence & Insights</h1>
            <p className="text-muted-foreground mt-1">
              AI-generated insights, recommendations, and business intelligence
            </p>
          </div>
        </div>
        <Button onClick={() => refetch()} disabled={loading}>
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
            <div className="text-2xl font-bold">{insights.filter((i: { priority?: string }) => i.priority === 'high').length}</div>
            <p className="text-xs text-muted-foreground">Require immediate action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(insights.map((i: { category?: string }) => i.category)).size}</div>
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
              {insights.length > 0 ? Math.round(insights.reduce((acc: number, i: { confidence?: number }) => acc + (i.confidence || 0), 0) / insights.length) : 0}%
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
                    <span className="font-medium">{(scoringModel.factors?.scoreWeight != null ? (scoringModel.factors.scoreWeight * 100).toFixed(0) : '—')}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Activity:</span>
                    <span className="font-medium">{(scoringModel.factors?.activityWeight != null ? (scoringModel.factors.activityWeight * 100).toFixed(0) : '—')}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recency:</span>
                    <span className="font-medium">{(scoringModel.factors?.recencyWeight != null ? (scoringModel.factors.recencyWeight * 100).toFixed(0) : '—')}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Funnel Time:</span>
                    <span className="font-medium">{(scoringModel.factors?.funnelTimeWeight != null ? (scoringModel.factors.funnelTimeWeight * 100).toFixed(0) : '—')}%</span>
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

      {/* Expanded Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              AI Recommendations
            </CardTitle>
            <CardDescription>All actionable recommendations grouped by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {(() => {
                // Group recommendations by category/type
                const grouped: Record<string, typeof recommendations> = {}
                recommendations.forEach((rec: { type?: string; priority?: string; title?: string; description?: string; action?: string; id?: string | number }) => {
                  const category = rec.type || rec.priority || 'general'
                  if (!grouped[category]) grouped[category] = []
                  grouped[category].push(rec)
                })
                const categoryLabels: Record<string, string> = {
                  'follow-up': 'Follow-Up Actions',
                  scoring: 'Scoring Improvements',
                  campaign: 'Campaign Ideas',
                  pipeline: 'Pipeline Optimization',
                  high: 'High Priority',
                  medium: 'Medium Priority',
                  low: 'Low Priority',
                  general: 'General',
                }
                return Object.entries(grouped).map(([cat, recs]) => (
                  <div key={cat} className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {categoryLabels[cat] || cat}
                    </h4>
                    {recs.map((rec: { id?: string | number; title?: string; description?: string; action?: string; priority?: string }, i: number) => (
                      <div key={rec.id || i} className="rounded-lg border p-3 space-y-1.5">
                        <div className="flex items-start justify-between">
                          <h5 className="text-sm font-medium">{rec.title}</h5>
                          {rec.priority && (
                            <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'warning' : 'secondary'} className="text-xs">
                              {rec.priority}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{rec.description}</p>
                        {rec.action && (
                          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => {
                            toast.info(`Action: ${rec.action}`)
                          }}>
                            <Zap className="mr-1 h-3 w-3" />
                            {rec.action}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insight Preferences */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreferences(!showPreferences)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          {showPreferences ? 'Hide Preferences' : 'Insight Preferences'}
        </Button>
      </div>

      {showPreferences && (
        <Card>
          <CardHeader>
            <CardTitle>Insight Preferences</CardTitle>
            <CardDescription>Configure which insights you see and how often</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority Threshold</label>
                <p className="text-xs text-muted-foreground">Only show insights at or above this priority</p>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={insightPriorityThreshold}
                  onChange={e => { setInsightPriorityThreshold(e.target.value); setPrefsDirty(true) }}
                >
                  <option value="all">Show All</option>
                  <option value="low">Low and above</option>
                  <option value="medium">Medium and above</option>
                  <option value="high">High and above</option>
                  <option value="critical">Critical only</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Insight Types</label>
                <p className="text-xs text-muted-foreground">Toggle which types to display</p>
                <div className="space-y-1.5">
                  {['lead_followup', 'scoring_accuracy', 'email_performance', 'pipeline_health'].map(type => (
                    <label key={type} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={insightTypes.includes(type)}
                        onChange={e => {
                          setInsightTypes(prev => e.target.checked ? [...prev, type] : prev.filter(t => t !== type))
                          setPrefsDirty(true)
                        }}
                        className="rounded border-gray-300"
                      />
                      {type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Digest Frequency</label>
                <p className="text-xs text-muted-foreground">How often to receive insight digests</p>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={digestFrequency}
                  onChange={e => { setDigestFrequency(e.target.value); setPrefsDirty(true) }}
                >
                  <option value="realtime">Real-time</option>
                  <option value="daily">Daily digest</option>
                  <option value="weekly">Weekly digest</option>
                </select>
              </div>
            </div>
            {prefsDirty && (
              <div className="mt-4 flex justify-end">
                <Button size="sm" onClick={() => saveInsightPrefs.mutate()} disabled={saveInsightPrefs.isPending}>
                  {saveInsightPrefs.isPending ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters & Tab Bar */}
      <div className="space-y-3">
        {/* Tab Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex border-b">
            {[
              { id: 'active' as InsightsTab, label: 'Active Insights' },
              { id: 'acted' as InsightsTab, label: 'Acted On' },
              { id: 'dismissed' as InsightsTab, label: 'Dismissed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Categories</option>
              <option value="Opportunity">Opportunity</option>
              <option value="Risk">Risk</option>
              <option value="Optimization">Optimization</option>
              <option value="Trend">Trend</option>
            </select>
            <div className="flex items-center gap-1">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="priority">Sort by Priority</option>
                <option value="newest">Sort by Newest</option>
                <option value="impact">Sort by Impact</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {(() => {
          const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
          // Tab filter
          let filtered = insights.filter((i: { dismissed?: boolean; actedOn?: boolean }) => {
            if (activeTab === 'dismissed') return i.dismissed
            if (activeTab === 'acted') return i.actedOn && !i.dismissed
            return !i.dismissed && !i.actedOn // active
          })
          // Priority filter
          if (priorityFilter !== 'all') filtered = filtered.filter((i: { priority?: string }) => i.priority === priorityFilter)
          // Category filter
          if (categoryFilter !== 'all') filtered = filtered.filter((i: { category?: string; type?: string }) => (i.category || i.type) === categoryFilter)
          // Search filter
          if (searchQuery) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter((i: { title?: string; description?: string }) =>
              (i.title || '').toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q)
            )
          }
          // Sort
          if (sortBy === 'newest') {
            filtered = [...filtered].sort((a: { createdAt?: string }, b: { createdAt?: string }) =>
              new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            )
          } else if (sortBy === 'priority') {
            filtered = [...filtered].sort((a: { priority?: string }, b: { priority?: string }) =>
              (priorityOrder[a.priority || 'medium'] || 2) - (priorityOrder[b.priority || 'medium'] || 2)
            )
          }
          // impact sort is same as priority for now

          return (
            <>
              <h2 className="text-xl font-semibold">
                {activeTab === 'active' ? 'Active Insights' : activeTab === 'acted' ? 'Acted On Insights' : 'Dismissed Insights'}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({filtered.length} results)
                </span>
              </h2>
              {filtered.map((insight: { id: string | number; title?: string; description?: string; priority?: string; category?: string; type?: string; confidence?: number; action?: string; date?: string; createdAt?: string; created?: string; impact?: string; dismissed?: boolean; actedOn?: boolean; actedOnAt?: string; actionTaken?: string }) => {
                const displayCategory = insight.category || insight.type || 'Trend'
                const Icon = categoryIcons[displayCategory as keyof typeof categoryIcons] || Sparkles
                const colorClass = categoryColors[displayCategory as keyof typeof categoryColors] || 'bg-gray-100 text-gray-600'

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
                                <Badge variant="outline">{displayCategory}</Badge>
                                <Badge
                                  variant={
                                    insight.priority === 'high' || insight.priority === 'critical'
                                      ? 'destructive'
                                      : insight.priority === 'medium'
                                      ? 'warning'
                                      : 'secondary'
                                  }
                                >
                                  {insight.priority} priority
                                </Badge>
                                {insight.actedOn && (
                                  <Badge variant="success">Acted On</Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {insight.createdAt ? new Date(insight.createdAt).toLocaleDateString() : insight.created}
                                </span>
                              </div>
                              <h3 className="text-lg font-semibold">{insight.title}</h3>
                            </div>
                            <div className="text-right">
                              {insight.confidence != null && (
                                <>
                                  <p className="text-sm text-muted-foreground">Confidence</p>
                                  <p className="text-2xl font-bold">{insight.confidence}%</p>
                                </>
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>

                          {insight.impact && (
                            <div className="bg-secondary/50 rounded-lg p-3 mb-3">
                              <p className="text-sm">
                                <span className="font-medium">Impact:</span> {insight.impact}
                              </p>
                            </div>
                          )}

                          {insight.actedOn && insight.actionTaken && (
                            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 mb-3">
                              <p className="text-sm">
                                <span className="font-medium text-green-700 dark:text-green-400">Action Taken:</span>{' '}
                                <span className="text-green-600 dark:text-green-300">{insight.actionTaken}</span>
                                {insight.actedOnAt && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    on {new Date(insight.actedOnAt).toLocaleDateString()}
                                  </span>
                                )}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {insight.action && (
                                <>
                                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Recommended: {insight.action}</span>
                                </>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              {!insight.dismissed && !insight.actedOn && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => handleDismissInsight(insight.id)}>
                                    Dismiss
                                  </Button>
                                  <Button size="sm" onClick={() => {
                                    handleTakeAction(insight)
                                    actMutation.mutate({ id: String(insight.id), actionTaken: insight.action || 'Action taken' })
                                  }}>
                                    Take Action
                                  </Button>
                                </>
                              )}
                              {insight.dismissed && (
                                <Badge variant="secondary">Dismissed</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* Empty State */}
              {filtered.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-1">No insights found</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      {searchQuery || priorityFilter !== 'all' || categoryFilter !== 'all'
                        ? 'No insights match your current filters. Try adjusting your search or filter criteria.'
                        : activeTab === 'dismissed'
                        ? 'No dismissed insights yet.'
                        : activeTab === 'acted'
                        ? 'No acted-on insights yet. Take action on an insight to see it here.'
                        : 'No active insights available. Click "Refresh Insights" to generate new ones.'}
                    </p>
                    {(searchQuery || priorityFilter !== 'all' || categoryFilter !== 'all') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => { setSearchQuery(''); setPriorityFilter('all'); setCategoryFilter('all'); }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )
        })()}
      </div>
    </div>
  );
};

export default IntelligenceInsights;
