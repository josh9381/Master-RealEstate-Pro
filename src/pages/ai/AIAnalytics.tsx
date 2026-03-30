import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Activity, TrendingUp, Zap, Brain, RefreshCw } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { aiApi } from '@/lib/api'
import { formatRate, calcRate } from '@/lib/metricsCalculator'
import { useToast } from '@/hooks/useToast'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { logger } from '@/lib/logger'
import { useState } from 'react'

const AIAnalytics = () => {
  const { toast } = useToast()
  const [dateRange, setDateRange] = useState('30d')

  const defaultAnalytics = {
    performanceData: [] as Array<{ date?: string; month?: string; accuracy?: number; latency?: number; throughput?: number }>,
    modelComparison: [] as Array<{ model: string; accuracy: number; speed: number; reliability: number }>,
  }

  const { data: analyticsData = defaultAnalytics, isLoading: loading, isError, error, refetch } = useQuery({
    queryKey: ['ai-analytics', dateRange],
    queryFn: async () => {
      try {
        const data = await aiApi.getModelPerformance()
        let performanceData: Array<{ date?: string; month?: string; accuracy?: number; latency?: number; throughput?: number }> = []
        let modelComparison: Array<{ model: string; accuracy: number; speed: number; reliability: number }> = []

        if (data?.history || data?.performance) {
          const raw = data.history || data.performance || []
          performanceData = raw.map((h: { date?: string; month?: string; accuracyAfter?: number; accuracy?: number; trainingDuration?: number; latency?: number; sampleSize?: number; throughput?: number }) => ({
            date: h.date ? new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : h.month,
            accuracy: h.accuracyAfter ?? h.accuracy ?? 0,
            latency: h.trainingDuration ?? h.latency ?? 0,
            throughput: h.sampleSize ?? h.throughput ?? 0,
          }))
        }
        // Derive model comparison from real API data
        if (data?.currentModels && Array.isArray(data.currentModels)) {
          modelComparison = data.currentModels.map((m: { user?: string; name?: string; model?: string; accuracy?: number; speed?: number; trainingDataCount?: number; lastTrainedAt?: string }) => ({
            model: m.user || m.name || m.model || 'Unknown',
            accuracy: Math.round(m.accuracy || 0),
            speed: m.speed ?? (m.trainingDataCount ? Math.min(100, m.trainingDataCount) : 0),
            reliability: m.lastTrainedAt ? 95 : 50,
          }))
        } else if (data?.models && Array.isArray(data.models)) {
          modelComparison = data.models.map((m: { name?: string; model?: string; accuracy?: number; speed?: number; latency?: number; reliability?: number; uptime?: number }) => ({
            model: m.name || m.model || 'Unknown',
            accuracy: m.accuracy || 0,
            speed: m.speed || m.latency ? Math.max(0, 100 - (m.latency || 0)) : 0,
            reliability: m.reliability || m.uptime || 0,
          }))
        }
        // If no real model data is available, leave modelComparison empty
        // instead of fabricating synthetic entries

        return { performanceData, modelComparison }
      } catch (error) {
        const err = error as Error
        logger.error('Failed to load AI analytics:', error)
        toast.error(err.message || 'Failed to load AI analytics')
        return defaultAnalytics
      }
    }
  })
  const { performanceData, modelComparison } = analyticsData

  // Calculate metrics from performance data
  const avgAccuracy = performanceData.length > 0
    ? formatRate(performanceData.reduce((sum, p) => sum + (p.accuracy || 0), 0) / performanceData.length, 1)
    : '0'
  const latestLatency = performanceData.length > 0
    ? performanceData[performanceData.length - 1]?.latency || 0
    : 0
  const latestThroughput = performanceData.length > 0
    ? performanceData[performanceData.length - 1]?.throughput || 0
    : 0

  if (loading) {
    return <LoadingSkeleton rows={5} showChart />;
  }

  if (isError) {
    return <ErrorBanner message={`Failed to load AI analytics: ${(error as Error)?.message || 'Unknown error'}`} retry={() => refetch()} />;
  }

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
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            aria-label="Select date range"
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value);
            }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button onClick={() => refetch()} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
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
            <p className="text-xs text-green-600">Latest measurement</p>
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
            <div className="text-2xl font-bold">
              {performanceData.length > 0
                ? `${formatRate(calcRate(performanceData.filter(p => (p.accuracy ?? 0) > 0).length, performanceData.length))}%`
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground" title={performanceData.length > 0 ? 'Percentage of data points with non-zero accuracy (proxy for service availability)' : 'No performance data available to calculate uptime'}>
              {performanceData.length > 0 ? 'Based on successful data points' : 'No performance data available'}
            </p>
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
          {modelComparison.length > 0 ? (
          <div className="space-y-4">
            {modelComparison.map((model) => (
              <div key={model.model} className="space-y-2">
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
          ) : (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No model data available. Train models to see performance comparisons.
            </div>
          )}
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
