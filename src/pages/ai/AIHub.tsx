import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Target, Users, TrendingUp, Sparkles, BarChart3, Upload, RefreshCw, Activity, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { aiApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

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

const AIHub = () => {
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [aiFeatures, setAiFeatures] = useState<any[]>([])
  const [modelPerformance, setModelPerformance] = useState<any[]>([])
  const [featureImportance, setFeatureImportance] = useState<any[]>([])
  const [trainingModels, setTrainingModels] = useState<any[]>([])
  const [dataQuality, setDataQuality] = useState<any[]>([])
  const [recentInsights, setRecentInsights] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const { toast } = useToast()
  
  // Load all AI Hub data
  useEffect(() => {
    loadAIData()
  }, [])

  const loadAIData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data in parallel
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
        aiApi.getStats().catch(() => ({ data: getMockStats() })),
        aiApi.getFeatures().catch(() => ({ data: getMockFeatures() })),
        aiApi.getModelPerformance(6).catch(() => ({ data: getMockPerformance() })),
        aiApi.getTrainingModels().catch(() => ({ data: getMockTrainingModels() })),
        aiApi.getDataQuality().catch(() => ({ data: getMockDataQuality() })),
        aiApi.getInsights({ limit: 3 }).catch(() => ({ data: getMockInsights() })),
        aiApi.getRecommendations({ limit: 3 }).catch(() => ({ data: getMockRecommendations() })),
        aiApi.getFeatureImportance('lead-scoring').catch(() => ({ data: getMockFeatureImportance() })),
      ])

      setStats(statsData.data)
      setAiFeatures(featuresData.data)
      setModelPerformance(performanceData.data)
      setTrainingModels(trainingData.data)
      setDataQuality(qualityData.data)
      setRecentInsights(insightsData.data)
      setRecommendations(recommendationsData.data)
      setFeatureImportance(importanceData.data)
    } catch (error) {
      console.error('Error loading AI data:', error)
      toast.warning('Error loading AI data', 'Using fallback data')
      
      // Use fallback mock data
      setStats(getMockStats())
      setAiFeatures(getMockFeatures())
      setModelPerformance(getMockPerformance())
      setTrainingModels(getMockTrainingModels())
      setDataQuality(getMockDataQuality())
      setRecentInsights(getMockInsights())
      setRecommendations(getMockRecommendations())
      setFeatureImportance(getMockFeatureImportance())
    } finally {
      setLoading(false)
    }
  }

  // Mock data functions (fallback)
  const getMockStats = () => ({
    activeModels: 6,
    modelsInTraining: 2,
    avgAccuracy: 91.2,
    accuracyChange: 2.3,
    predictionsToday: 2547,
    predictionsChange: 12,
    activeInsights: 23,
    highPriorityInsights: 3
  })

  const getMockFeatures = () => [
    {
      id: 1,
      title: 'Lead Scoring',
      description: 'AI-powered lead quality prediction',
      status: 'active',
      accuracy: '94%',
      leadsScored: 1247,
    },
    {
      id: 2,
      title: 'Customer Segmentation',
      description: 'Intelligent customer grouping',
      status: 'active',
      accuracy: '89%',
      segments: 12,
    },
    {
      id: 3,
      title: 'Predictive Analytics',
      description: 'Forecast outcomes and trends',
      status: 'training',
      accuracy: '91%',
      predictions: 856,
    },
    {
      id: 4,
      title: 'Model Training',
      description: 'Train and optimize AI models',
      status: 'active',
      accuracy: '87%',
      models: 5,
    },
    {
      id: 5,
      title: 'Intelligence Insights',
      description: 'Automated business insights',
      status: 'active',
      insights: 23,
    },
    {
      id: 6,
      title: 'Performance Analytics',
      description: 'AI model performance metrics',
      status: 'active',
      accuracy: '92%',
    },
  ]

  const getMockPerformance = () => [
    { month: 'Jan', accuracy: 85, predictions: 450 },
    { month: 'Feb', accuracy: 87, predictions: 520 },
    { month: 'Mar', accuracy: 89, predictions: 610 },
    { month: 'Apr', accuracy: 91, predictions: 680 },
    { month: 'May', accuracy: 92, predictions: 750 },
    { month: 'Jun', accuracy: 94, predictions: 820 },
  ]

  const getMockFeatureImportance = () => [
    { name: 'Email Engagement', value: 28, color: '#3b82f6' },
    { name: 'Response Time', value: 22, color: '#10b981' },
    { name: 'Budget Range', value: 18, color: '#f59e0b' },
    { name: 'Company Size', value: 15, color: '#8b5cf6' },
    { name: 'Lead Source', value: 12, color: '#ec4899' },
    { name: 'Other', value: 5, color: '#6b7280' },
  ]

  const getMockTrainingModels = () => [
    { name: 'Lead Scoring v2', progress: 85, eta: '2 hours', status: 'training' },
    { name: 'Churn Prediction', progress: 45, eta: '6 hours', status: 'training' },
    { name: 'Email Optimization', progress: 100, eta: 'Complete', status: 'complete' },
  ]

  const getMockDataQuality = () => [
    { metric: 'Completeness', score: 92, status: 'good' },
    { metric: 'Accuracy', score: 88, status: 'good' },
    { metric: 'Consistency', score: 75, status: 'warning' },
    { metric: 'Timeliness', score: 95, status: 'excellent' },
  ]

  const getMockRecommendations = () => [
    {
      id: 1,
      title: 'Focus on high-value leads',
      description: 'Prioritize 15 leads with >85% conversion probability',
      impact: 'High',
      action: 'View Leads',
      icon: Target,
    },
    {
      id: 2,
      title: 'Optimize email send times',
      description: 'Best engagement at 10 AM and 3 PM on Tuesdays',
      impact: 'Medium',
      action: 'Schedule Campaign',
      icon: Sparkles,
    },
    {
      id: 3,
      title: 'Re-engage dormant leads',
      description: '23 qualified leads inactive for 30+ days',
      impact: 'Medium',
      action: 'Create Workflow',
      icon: RefreshCw,
    },
  ]

  const getMockInsights = () => [
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
  ]
  
  const handleUploadData = async () => {
    setUploading(true)
    try {
      await aiApi.uploadTrainingData({
        modelType: 'lead-scoring',
        data: [] // In production, this would be actual data
      })
      toast.success('Success', 'Training data uploaded successfully!')
      loadAIData() // Reload data
    } catch (error) {
      toast.error('Error', 'Failed to upload training data')
    } finally {
      setUploading(false)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  // Recent insights with fallback
  const recentInsightsData = recentInsights.length > 0 ? recentInsights : getMockInsights()
  
  // AI Features with icon mapping
  const aiFeaturesData = (aiFeatures.length > 0 ? aiFeatures : getMockFeatures()).map(feature => ({
    ...feature,
    icon: feature.id === 1 ? Target :
          feature.id === 2 ? Users :
          feature.id === 3 ? TrendingUp :
          feature.id === 4 ? Brain :
          feature.id === 5 ? Sparkles :
          BarChart3,
    path: `/ai/${feature.title.toLowerCase().replace(/\s+/g, '-')}`
  }))

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
            <div className="text-2xl font-bold">{stats?.activeModels || 6}</div>
            <p className="text-xs text-muted-foreground">+{stats?.modelsInTraining || 2} in training</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgAccuracy || 91.2}%</div>
            <p className="text-xs text-muted-foreground">+{stats?.accuracyChange || 2.3}% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Predictions Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.predictionsToday?.toLocaleString() || '2,547'}</div>
            <p className="text-xs text-muted-foreground">+{stats?.predictionsChange || 12}% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Insights</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeInsights || 23}</div>
            <p className="text-xs text-muted-foreground">{stats?.highPriorityInsights || 3} high priority</p>
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
              const Icon = typeof rec.icon === 'string' ? iconMap[rec.icon] || Target : rec.icon
              return (
                <div key={rec.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
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
                  <Button variant="outline" size="sm" className="w-full">
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
