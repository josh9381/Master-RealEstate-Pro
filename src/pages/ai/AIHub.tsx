import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Brain, Target, Users, TrendingUp, Sparkles, BarChart3, Upload, RefreshCw, Activity, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { aiApi, tasksApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { useQuery } from '@tanstack/react-query';
import { MOCK_DATA_CONFIG } from '@/config/mockData.config';

// Icon mapping for API responses (which return icon names as strings)
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Sparkles,
  RefreshCw,
  Brain,
  Users,
  TrendingUp,
  BarChart3,
  Activity,
  AlertCircle,
  CheckCircle,
  Zap,
};

// Type definitions for AI Hub data
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
  id: number;
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

interface ModelPerformanceEntry {
  month: string;
  accuracy: number;
  predictions: number;
}

interface FeatureImportanceEntry {
  name: string;
  value: number;
  color?: string;
  importance?: number;
}

interface TrainingModel {
  id?: string;
  name: string;
  status: string;
  accuracy?: number;
  lastTrained?: string;
  progress?: number;
  eta?: string;
}

interface DataQualityEntry {
  metric: string;
  score: number;
  status: string;
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

const AIHub = () => {
  const navigate = useNavigate()
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  // Fetch all AI Hub data via useQuery
  const { data: aiData, isLoading: loading, refetch } = useQuery({
    queryKey: ['ai', 'hub'],
    queryFn: async () => {
      const [
        statsData,
        featuresData,
        performanceData,
        trainingData,
        qualityData,
        insightsData,
        recommendationsData,
        importanceData,
      ] = await Promise.all([
        aiApi.getStats(),
        aiApi.getFeatures(),
        aiApi.getModelPerformance(6),
        aiApi.getTrainingModels(),
        aiApi.getDataQuality(),
        aiApi.getInsights({ limit: 3 }),
        aiApi.getRecommendations({ limit: 3 }),
        aiApi.getFeatureImportance('lead-scoring'),
      ])
      return {
        stats: statsData.data as AIStats | null,
        aiFeatures: (featuresData.data || []) as AIFeature[],
        modelPerformance: (performanceData.data || []) as ModelPerformanceEntry[],
        trainingModels: (trainingData.data || []) as TrainingModel[],
        dataQuality: (qualityData.data || []) as DataQualityEntry[],
        recentInsights: (insightsData.data || []) as AIInsight[],
        recommendations: (recommendationsData.data || []) as AIRecommendation[],
        featureImportance: (importanceData.data || []) as FeatureImportanceEntry[],
      }
    },
    meta: { useMockOnError: MOCK_DATA_CONFIG.USE_MOCK_DATA },
  })

  const stats = aiData?.stats ?? null
  const aiFeatures = aiData?.aiFeatures ?? []
  const modelPerformance = aiData?.modelPerformance ?? []
  const featureImportance = aiData?.featureImportance ?? []
  const trainingModels = aiData?.trainingModels ?? []
  const dataQuality = aiData?.dataQuality ?? []
  const recentInsights = aiData?.recentInsights ?? []
  const recommendations = aiData?.recommendations ?? []

  // Handle recommendation action buttons — execute real actions where possible
  const handleRecommendationAction = async (rec: AIRecommendation) => {
    const action = rec.action?.toLowerCase() || ''
    try {
      if (action.includes('follow up') || action.includes('task') || action.includes('create task')) {
        // Create a follow-up task from the recommendation
        await tasksApi.createTask({
          title: rec.title || 'AI-recommended follow-up',
          description: rec.description || `AI Recommendation: ${rec.action}`,
          priority: rec.priority === 'high' || rec.priority === 'critical' ? 'high' : 'medium',
          status: 'pending',
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
      toast.error('Failed to execute action. Please try again.')
    }
  }
  

  
  const handleUploadData = async () => {
    // Create file input for user to select training data file
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.csv,.json'
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setUploading(true)
      try {
        const text = await file.text()
        const data = file.name.endsWith('.json') ? JSON.parse(text) : text
        await aiApi.uploadTrainingData({
          modelType: 'lead-scoring',
          data: Array.isArray(data) ? data : [data]
        })
        toast.success('Success', 'Training data uploaded successfully!')
        refetch()
      } catch (error) {
        toast.error('Error', 'Failed to upload training data')
      } finally {
        setUploading(false)
      }
    }
    fileInput.click()
  }

  // Show loading state
  if (loading) {
    return <LoadingSkeleton rows={3} showChart={true} />;
  }
  
  // Recent insights — no mock fallback (show empty if no data)
  const recentInsightsData = recentInsights
  
  // AI Features with icon mapping
  // Route mapping: feature title -> actual route path
  const routeMap: Record<string, string> = {
    'Lead Scoring': '/ai/lead-scoring',
    'Customer Segmentation': '/ai/segmentation',
    'Predictive Analytics': '/ai/predictive',
    'Model Training': '/ai/training',
    'Intelligence Insights': '/ai/insights',
    'Performance Analytics': '/ai/analytics',
  };
  const comingSoonFeatureIds = [2, 4] // Customer Segmentation, Model Training
  const aiFeaturesData = aiFeatures.length > 0 ? aiFeatures.map(feature => ({
    ...feature,
    icon: feature.id === 1 ? Target :
          feature.id === 2 ? Users :
          feature.id === 3 ? TrendingUp :
          feature.id === 4 ? Brain :
          feature.id === 5 ? Sparkles :
          BarChart3,
    path: routeMap[feature.title] || `/ai/${feature.title.toLowerCase().replace(/\s+/g, '-')}`,
    comingSoon: comingSoonFeatureIds.includes(feature.id as number),
  })) : []

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
            <p className="text-xs text-muted-foreground">{stats?.accuracyChange != null ? `+${stats.accuracyChange}% from last month` : 'No data'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Predictions Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.predictionsToday != null ? stats.predictionsToday.toLocaleString() : '—'}</div>
            <p className="text-xs text-muted-foreground">{stats?.predictionsChange != null ? `+${stats.predictionsChange}% from yesterday` : 'No data'}</p>
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

      {/* AI Features Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">AI Features</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {aiFeaturesData.map((feature) => {
            // Handle both component references (mock data) and string names (API data)
            const Icon = typeof feature.icon === 'string' ? iconMap[feature.icon] || Brain : feature.icon;
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
                        {feature.comingSoon ? (
                          <Badge variant="warning" className="mt-1">Coming Soon</Badge>
                        ) : (
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
                        )}
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
            {recentInsightsData.map((insight) => (
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

      {/* Model Performance Chart */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Model Accuracy Trend</CardTitle>
            <CardDescription>Prediction accuracy over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={modelPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Importance</CardTitle>
            <CardDescription>Factors affecting predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={featureImportance}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {featureImportance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Training Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Model Training</CardTitle>
              <CardDescription>Active training sessions</CardDescription>
            </div>
            <Button onClick={handleUploadData} disabled={uploading}>
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload Training Data'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trainingModels.map((model, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{model.name}</span>
                    <Badge
                      variant={
                        model.status === 'complete'
                          ? 'success'
                          : model.status === 'training'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {model.status}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">ETA: {model.eta}</span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full transition-all ${
                      model.status === 'complete' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${model.progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{model.progress}% complete</span>
                  {model.status === 'training' && (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Training...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Quality Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Data Quality Metrics</CardTitle>
          <CardDescription>Quality assessment of training data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {dataQuality.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.metric}</span>
                  {item.status === 'excellent' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : item.status === 'good' ? (
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${
                      item.status === 'excellent'
                        ? 'bg-green-500'
                        : item.status === 'good'
                        ? 'bg-blue-500'
                        : 'bg-yellow-500'
                    }`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold">{item.score}%</span>
                </div>
              </div>
            ))}
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
          <div className="grid gap-4 md:grid-cols-3">
            {recommendations.map((rec) => {
              // Handle both component references (mock data) and string names (API data)
              const Icon = typeof rec.icon === 'string' ? (iconMap[rec.icon] || Target) : (rec.icon || Target)
              return (
                <div key={rec.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {Icon && <Icon className="h-5 w-5 text-primary" />}
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
                      {rec.impact} Impact
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleRecommendationAction(rec)}>
                    <Zap className="mr-2 h-4 w-4" />
                    {rec.action}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Prediction Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Predictions</CardTitle>
          <CardDescription>Total predictions generated per month</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={modelPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="predictions" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIHub;
