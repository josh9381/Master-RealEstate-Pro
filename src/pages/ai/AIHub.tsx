import { logger } from '@/lib/logger'
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Brain, Target, TrendingUp, Sparkles, BarChart3, RefreshCw, CheckCircle, Zap, Settings, MessageSquare, Wand2, FileText, ArrowRight, Bot, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { aiApi, tasksApi } from '@/lib/api';
import { calcProgress } from '@/lib/metricsCalculator';
import { useToast } from '@/hooks/useToast';
import { useQuery } from '@tanstack/react-query';

// Icon mapping for API responses
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Target, Sparkles, RefreshCw, Brain, TrendingUp, BarChart3, CheckCircle, Zap,
};

// Type definitions
interface AIStats {
  activeModels: number;
  modelsInTraining: number;
  avgAccuracy: number;
  accuracyChange: number;
  predictionsToday?: number;
  predictionsChange?: number;
  activeInsights?: number;
  highPriorityInsights?: number;
  totalPredictions?: number;
  insightsGenerated?: number;
  insightsChange?: number;
}

interface AIFeature {
  id: number | string;
  title: string;
  description: string;
  accuracy?: string | number;
  status?: string;
  leadsScored?: number;
  segments?: number;
  predictions?: number;
  models?: number;
  insights?: number;
}

interface AIInsight {
  id: string | number;
  title: string;
  description: string;
  type?: string;
  priority?: string;
  date?: string;
  category?: string;
  impact?: string;
  timestamp?: string;
}

interface AIRecommendation {
  id: string | number;
  title: string;
  description: string;
  priority?: string;
  impact?: string;
  action?: string;
  icon?: React.ComponentType<{ className?: string }> | string;
}

interface AIUsage {
  tier: string;
  useOwnKey: boolean;
  usage: {
    aiMessages: number;
    contentGenerations: number;
    composeUses: number;
    totalTokensUsed: number;
    totalCost: number;
  };
  limits: {
    maxMonthlyAIMessages: number | 'unlimited';
    maxContentGenerations: number | 'unlimited';
    maxComposeUses: number | 'unlimited';
  };
}

// "Where AI is Working" feature status items
const embeddedFeatures = [
  { name: 'Lead Scoring', icon: Target, description: 'Scoring all leads' },
  { name: 'Chatbot', icon: Bot, description: '25+ functions' },
  { name: 'AI Compose', icon: MessageSquare, description: 'Streaming' },
  { name: 'Content Gen', icon: FileText, description: '5 types' },
  { name: 'Message Enhancer', icon: Wand2, description: '6 tones' },
  { name: 'Template AI', icon: Sparkles, description: 'Active' },
];

const AIHub = () => {
  const navigate = useNavigate()
  const { toast } = useToast()

  // Fetch hub data — only what the overview dashboard needs
  const { data: aiData, isLoading: loading, isError, error, refetch } = useQuery({
    queryKey: ['ai', 'hub'],
    queryFn: async () => {
      const [
        statsData,
        featuresData,
        insightsData,
        recommendationsData,
        usageData,
      ] = await Promise.all([
        aiApi.getStats(),
        aiApi.getFeatures(),
        aiApi.getInsights({ limit: 3 }),
        aiApi.getRecommendations({ limit: 3 }),
        aiApi.getUsageLimits(),
      ])
      return {
        stats: statsData.data as AIStats | null,
        aiFeatures: (featuresData.data || []) as AIFeature[],
        recentInsights: (insightsData.data || []) as AIInsight[],
        recommendations: (recommendationsData.data || []) as AIRecommendation[],
        usage: usageData.data as AIUsage | null,
      }
    },

  })

  const stats = aiData?.stats ?? null
  const aiFeatures = aiData?.aiFeatures ?? []
  const recentInsights = aiData?.recentInsights ?? []
  const recommendations = aiData?.recommendations ?? []
  const usage = aiData?.usage ?? null

  // Handle recommendation action buttons
  const handleRecommendationAction = async (rec: AIRecommendation) => {
    const action = rec.action?.toLowerCase() || ''
    try {
      if (action.includes('follow up') || action.includes('task') || action.includes('create task')) {
        await tasksApi.createTask({
          title: rec.title || 'AI-recommended follow-up',
          description: rec.description || `AI Recommendation: ${rec.action}`,
          priority: rec.priority === 'high' || rec.priority === 'critical' ? 'high' : 'medium',
          status: 'PENDING',
        })
        toast.success('Follow-up task created from recommendation')
      } else if (action.includes('campaign') || action.includes('schedule')) {
        navigate('/campaigns/create')
        toast.info('Navigating to campaign creation')
      } else if (action.includes('email') || action.includes('send')) {
        navigate('/communication')
        toast.info('Navigating to communication center')
      } else if (action.includes('workflow') || action.includes('create workflow')) {
        navigate('/workflows')
        toast.info('Navigating to workflows')
      } else if (action.includes('analytics') || action.includes('report')) {
        navigate('/analytics')
        toast.info('Navigating to analytics')
      } else if (action.includes('view lead')) {
        navigate('/leads?sort=score&order=desc')
        toast.info('Navigating to top-scored leads')
      } else {
        navigate('/leads')
        toast.info(`Navigating to: ${rec.action}`)
      }
    } catch (error) {
      logger.error('Failed to execute AI action:', error)
      toast.error('Failed to execute action. Please try again.')
    }
  }

  if (loading) {
    return <LoadingSkeleton rows={3} showChart={true} />;
  }

  if (isError) {
    return <ErrorBanner message={`Failed to load AI Hub: ${(error as Error)?.message || 'Unknown error'}`} retry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -top-8 -left-8 h-28 w-28 rounded-full bg-blue-400/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
              <Brain className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold">AI Hub</h1>
          </div>
          <p className="text-white/70 ml-[52px]">
            Your AI control center — monitor, configure, and understand your AI across the platform
          </p>
        </div>
      </div>

      {/* Section B: "Where AI is Working" Status Bar */}
      <Card className="border-border/60">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
              <Brain className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm font-semibold">AI is active across your CRM</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {embeddedFeatures.map((feature) => {
              // Check if the feature is active from API data
              const apiFeature = aiFeatures.find(f =>
                f.title.toLowerCase().includes(feature.name.toLowerCase().split(' ')[0])
              )
              const isActive = apiFeature?.status === 'active' || !apiFeature // Assume active if not returned
              return (
                <div
                  key={feature.name}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/40 text-sm hover:bg-muted/80 transition-colors"
                >
                  <feature.icon className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="font-medium text-foreground/90">{feature.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {apiFeature?.leadsScored ? `${apiFeature.leadsScored} scored` : feature.description}
                  </span>
                  <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-success shadow-sm shadow-success/50' : 'bg-muted-foreground/40'}`} />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section C: AI Health Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeModels ?? '—'}</div>
            <p className="text-xs text-muted-foreground">{stats?.modelsInTraining != null ? `+${stats.modelsInTraining} in training` : 'No data'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgAccuracy != null ? `${stats.avgAccuracy}%` : '—'}</div>
            <p className="text-xs text-muted-foreground">{stats?.accuracyChange != null ? `${stats.accuracyChange >= 0 ? '+' : ''}${stats.accuracyChange}% from last month` : 'No data'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Predictions Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.predictionsToday != null ? stats.predictionsToday.toLocaleString() : '—'}</div>
            <p className="text-xs text-muted-foreground">{stats?.predictionsChange != null ? `${stats.predictionsChange >= 0 ? '+' : ''}${stats.predictionsChange}% from yesterday` : 'No data'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Insights</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeInsights ?? '—'}</div>
            <p className="text-xs text-muted-foreground">{stats?.highPriorityInsights != null ? `${stats.highPriorityInsights} high priority` : 'No data'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Section C.5: AI Usage This Month */}
      {usage && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">AI Usage This Month</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-normal">{usage.tier} tier</Badge>
                {usage.useOwnKey && <Badge variant="secondary" className="text-xs font-normal">Own API key</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'AI Messages', used: usage.usage.aiMessages, limit: usage.limits.maxMonthlyAIMessages },
                { label: 'Content Generations', used: usage.usage.contentGenerations, limit: usage.limits.maxContentGenerations },
                { label: 'Compose Uses', used: usage.usage.composeUses, limit: usage.limits.maxComposeUses },
              ].map((item) => {
                const isUnlimited = item.limit === 'unlimited'
                const pct = isUnlimited ? 0 : calcProgress(item.used, item.limit as number)
                const isWarning = !isUnlimited && pct >= 80
                const isDanger = !isUnlimited && pct >= 95
                return (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={`font-medium ${isDanger ? 'text-destructive' : isWarning ? 'text-warning' : ''}`}>
                        {item.used.toLocaleString()} / {isUnlimited ? '∞' : (item.limit as number).toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isDanger ? 'bg-destructive' : isWarning ? 'bg-warning' : 'bg-primary'}`}
                        style={{ width: isUnlimited ? '0%' : `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            {usage.usage.totalCost > 0 && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                Total tokens: {usage.usage.totalTokensUsed.toLocaleString()} · Estimated cost: ${usage.usage.totalCost.toFixed(2)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section D: Recent Insights + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Insights */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent AI Insights</CardTitle>
                <CardDescription>Automated insights from your AI models</CardDescription>
              </div>
              <Link to="/ai/intelligence">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentInsights.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No recent insights available</p>
              ) : (
                recentInsights.map((insight) => (
                  <div key={insight.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        insight.type === 'opportunity'
                          ? 'bg-success/10 text-success'
                          : insight.type === 'warning'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm truncate">{insight.title}</h4>
                        <Badge
                          variant={
                            insight.priority === 'high'
                              ? 'destructive'
                              : insight.priority === 'medium'
                              ? 'warning'
                              : 'secondary'
                          }
                          className="shrink-0"
                        >
                          {insight.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{insight.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>AI-Powered Recommendations</CardTitle>
            <CardDescription>Actionable insights based on AI analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No recommendations available</p>
              ) : (
                recommendations.map((rec) => {
                  const Icon = typeof rec.icon === 'string' ? (iconMap[rec.icon] || Target) : (rec.icon || Target)
                  return (
                    <div key={rec.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            {Icon && <Icon className="h-4 w-4 text-primary" />}
                          </div>
                          <h4 className="font-medium text-sm">{rec.title}</h4>
                        </div>
                        <Badge
                          variant={
                            rec.impact === 'High'
                              ? 'destructive'
                              : rec.impact === 'Medium'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {rec.impact}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{rec.description}</p>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => handleRecommendationAction(rec)}>
                        <Zap className="mr-1.5 h-3.5 w-3.5" />
                        {rec.action}
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common AI operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button variant="outline" className="justify-start" onClick={() => navigate('/ai/lead-scoring')} aria-label="Recalculate lead scores">
              <RefreshCw className="h-4 w-4 mr-2" />
              Recalculate Scores
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => navigate('/ai/intelligence')} aria-label="View Intelligence Hub">
              <Sparkles className="h-4 w-4 mr-2" />
              Intelligence Hub
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => navigate('/ai/settings')} aria-label="Configure AI profile">
              <Settings className="h-4 w-4 mr-2" />
              Configure AI Profile
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => navigate('/ai/cost-dashboard')} aria-label="View cost dashboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              Cost Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIHub;
