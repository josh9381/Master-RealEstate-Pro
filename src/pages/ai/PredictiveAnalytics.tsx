import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { aiApi } from '@/lib/api';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const PredictiveAnalytics = () => {
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null);

  const defaultPredictiveData = {
    predictions: [] as Array<{ id: string; title: string; prediction: string; confidence: number; impact: string; status: string; details: string; dataPoints?: number }>,
    stats: { activePredictions: 0, avgConfidence: 0, highImpactAlerts: 0, accuracy: 0 },
    revenueForecast: [] as Array<{ month: string; predicted?: number; actual?: number; confidence?: number }>,
    conversionTrend: [] as Array<{ month: string; converted: number; total: number; rate: number }>,
    stageDistribution: [] as Array<{ stage: string; count: number }>,
    pipelineSummary: { avgDaysInPipeline: 0, totalPipelineValue: 0, activeDeals: 0 },
  }

  const { data: predictiveData = defaultPredictiveData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['predictive-analytics'],
    queryFn: async () => {
      const response = await aiApi.getGlobalPredictions();
      const d = response?.data || response;
      return {
        predictions: d.predictions || [],
        stats: d.stats || defaultPredictiveData.stats,
        revenueForecast: d.revenueForecast || [],
        conversionTrend: d.conversionTrend || [],
        stageDistribution: d.stageDistribution || [],
        pipelineSummary: d.pipelineSummary || defaultPredictiveData.pipelineSummary,
      };
    },
  })
  const { predictions, stats, revenueForecast, conversionTrend, pipelineSummary } = predictiveData

  if (isLoading) {
    return <LoadingSkeleton rows={5} showChart />;
  }

  if (isError) {
    return <ErrorBanner message={`Failed to load predictions: ${(error as Error)?.message || 'Unknown error'}`} retry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Predictive Analytics</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered forecasts and business predictions
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" disabled title="Model configuration coming soon">Configure Models</Button>
          <Button onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Run Predictions'}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Predictions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePredictions}</div>
            <p className="text-xs text-muted-foreground">From model data</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgConfidence}%</div>
            <p className="text-xs text-muted-foreground">Across all models</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High-Impact Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highImpactAlerts}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prediction Accuracy</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.accuracy}%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Forecast</CardTitle>
          <CardDescription>
            Predicted revenue with confidence intervals for next 4 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          {revenueForecast.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={revenueForecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="lower"
                stackId="1"
                stroke="none"
                fill="hsl(var(--primary))"
                fillOpacity={0.1}
              />
              <Area
                type="monotone"
                dataKey="upper"
                stackId="1"
                stroke="none"
                fill="hsl(var(--primary))"
                fillOpacity={0.1}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              No forecast data available yet. Revenue forecast requires historical data.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conversion Trend Prediction */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate Trend</CardTitle>
            <CardDescription>Monthly conversion rates with trend</CardDescription>
          </CardHeader>
          <CardContent>
            {conversionTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={conversionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="rate"
                  name="Conversion %"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total Leads"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No conversion trend data available yet. Add leads to generate trends.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Key Predictions</CardTitle>
            <CardDescription>High-confidence predictions requiring action</CardDescription>
          </CardHeader>
          <CardContent>
            {predictions.length > 0 ? (
            <div className="space-y-4 max-h-[250px] overflow-y-auto">
              {predictions.slice(0, 4).map((prediction: any) => (
                <div key={prediction.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div
                    className={`p-2 rounded-lg ${
                      prediction.status === 'positive'
                        ? 'bg-green-100 text-green-600'
                        : prediction.status === 'warning'
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {prediction.status === 'positive' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : prediction.status === 'warning' ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-medium">{prediction.title}</h4>
                      <Badge variant="outline">{prediction.confidence}%</Badge>
                    </div>
                    <p className="text-sm font-semibold mt-1">{prediction.prediction}</p>
                    <p className="text-xs text-muted-foreground mt-1">{prediction.details}</p>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No predictions available yet. Run model training to generate predictions.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Summary */}
      {pipelineSummary.activeDeals > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Summary</CardTitle>
            <CardDescription>Current pipeline health metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-3xl font-bold">{pipelineSummary.activeDeals}</p>
                <p className="text-sm text-muted-foreground">Active Deals</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-3xl font-bold">{pipelineSummary.avgDaysInPipeline}d</p>
                <p className="text-sm text-muted-foreground">Avg Pipeline Duration</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-3xl font-bold">${pipelineSummary.totalPipelineValue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Predictions List */}
      {predictions.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>All Predictions</CardTitle>
          <CardDescription>Complete list of active predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {predictions.map((prediction: any) => (
              <div key={prediction.id} className="border rounded-lg">
                <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-4">
                  <div
                    className={`p-2 rounded-lg ${
                      prediction.status === 'positive'
                        ? 'bg-green-100 text-green-600'
                        : prediction.status === 'warning'
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {prediction.status === 'positive' ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : prediction.status === 'warning' ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{prediction.title}</h4>
                    <p className="text-sm text-muted-foreground">{prediction.prediction}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">Confidence</p>
                    <p className="text-lg font-bold">{prediction.confidence}%</p>
                  </div>
                  <Badge
                    variant={
                      prediction.impact === 'high'
                        ? 'destructive'
                        : prediction.impact === 'medium'
                        ? 'warning'
                        : 'secondary'
                    }
                  >
                    {prediction.impact} impact
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPrediction(
                      selectedPrediction?.id === prediction.id ? null : prediction
                    )}
                  >
                    {selectedPrediction?.id === prediction.id ? (
                      <><ChevronUp className="h-4 w-4 mr-1" />Hide</>
                    ) : (
                      <><ChevronDown className="h-4 w-4 mr-1" />Details</>
                    )}
                  </Button>
                </div>
              </div>
              {selectedPrediction?.id === prediction.id && (
                <div className="mt-3 ml-14 p-4 bg-secondary/30 rounded-lg space-y-2">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Data Points</p>
                      <p className="text-sm font-medium">{prediction.dataPoints || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Confidence Range</p>
                      <p className="text-sm font-medium">
                        {Math.max(0, prediction.confidence - 10)}% – {Math.min(100, prediction.confidence + 5)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Impact Level</p>
                      <p className="text-sm font-medium capitalize">{prediction.impact}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Analysis</p>
                    <p className="text-sm">{prediction.details}</p>
                  </div>
                  <div className="pt-1">
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          prediction.confidence >= 80 ? 'bg-green-500' : prediction.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${prediction.confidence}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Confidence: {prediction.confidence}%</p>
                  </div>
                </div>
              )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
};

export default PredictiveAnalytics;
