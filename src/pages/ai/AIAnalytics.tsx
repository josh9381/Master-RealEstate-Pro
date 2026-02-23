import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Activity, TrendingUp, Zap, Brain, RefreshCw } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { aiApi } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

const AIAnalytics = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [performanceData, setPerformanceData] = useState<Array<{
    date?: string;
    month?: string;
    accuracy?: number;
    latency?: number;
    throughput?: number;
  }>>([])
  
  useEffect(() => {
    const fetchData = async () => {
      await loadAnalytics()
    }
    fetchData()
  }, [])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const data = await aiApi.getModelPerformance()
      if (data?.performance) {
        setPerformanceData(data.performance)
      }
    } catch (error) {
      const err = error as Error
      toast.error(err.message || 'Failed to load AI analytics')
    } finally {
      setLoading(false)
    }
  }

  // Model comparison data (can be from API or static)
  const modelComparison = [
    { model: 'Lead Scoring', accuracy: 94, speed: 95, reliability: 98 },
    { model: 'Segmentation', accuracy: 89, speed: 92, reliability: 96 },
    { model: 'Predictive', accuracy: 91, speed: 88, reliability: 94 },
    { model: 'Churn Model', accuracy: 87, speed: 90, reliability: 93 },
  ]

  // Calculate metrics from performance data
  const avgAccuracy = performanceData.length > 0
    ? (performanceData.reduce((sum, p) => sum + (p.accuracy || 0), 0) / performanceData.length).toFixed(1)
    : '0'
  const latestLatency = performanceData.length > 0
    ? performanceData[performanceData.length - 1]?.latency || 0
    : 0
  const latestThroughput = performanceData.length > 0
    ? performanceData[performanceData.length - 1]?.throughput || 0
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Performance Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Detailed performance metrics and analytics for all AI models
          </p>
        </div>
        <Button onClick={loadAnalytics} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestLatency}ms</div>
            <p className="text-xs text-green-600">Real-time data</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Model Accuracy</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgAccuracy}%</div>
            <p className="text-xs text-green-600">Average across models</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestThroughput}/min</div>
            <p className="text-xs text-green-600">Current rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">Not yet tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Accuracy Trend</CardTitle>
            <CardDescription>Model accuracy over the last 6 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[85, 95]} />
                <Tooltip />
                <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Throughput Trend</CardTitle>
            <CardDescription>Predictions per minute</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="throughput" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Model Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Model Performance Comparison</CardTitle>
          <CardDescription>Compare key metrics across all AI models</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {modelComparison.map((model, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{model.model}</span>
                  <div className="flex gap-4">
                    <Badge variant="outline">{model.accuracy}% Accuracy</Badge>
                    <Badge variant="outline">{model.speed}% Speed</Badge>
                    <Badge variant="outline">{model.reliability}% Reliable</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${model.accuracy}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Accuracy</p>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${model.speed}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Speed</p>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${model.reliability}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Reliability</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Latency Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time Analysis</CardTitle>
          <CardDescription>Model latency over time (lower is better)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="latency" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

export default AIAnalytics
