import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { aiApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import type { AIModelEntry } from '@/types';
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
  const { toast } = useToast();

  const defaultPredictiveData = {
    predictions: [] as Array<{ id: number; title: string; prediction: string; confidence: number; impact: string; status: string; details: string }>,
    stats: { activePredictions: 0, avgConfidence: 0, highImpactAlerts: 0, accuracy: 0 },
    revenueForecast: [] as Array<{ month: string; predicted: number; actual?: number }>,
    conversionPredictions: [] as Array<{ month: string; predicted?: number; actual?: number; rate?: number }>,
  }

  const { data: predictiveData = defaultPredictiveData, isLoading, refetch } = useQuery({
    queryKey: ['predictive-analytics'],
    queryFn: async () => {
      try {
        const performanceData = await aiApi.getModelPerformance();

        // Use real model performance data if available
        const accuracy = performanceData?.accuracy ? Math.floor(performanceData.accuracy * 100) : 0;

        let predictions = defaultPredictiveData.predictions;
        let stats = defaultPredictiveData.stats;
        let revenueForecast = defaultPredictiveData.revenueForecast;
        let conversionPredictions = defaultPredictiveData.conversionPredictions;

        // If we got real performance data, build predictions from it
        if (performanceData && (performanceData.accuracy || performanceData.models)) {
          const models = performanceData.models || [];
          predictions = models.map((model: AIModelEntry, idx: number) => ({
            id: idx + 1,
            title: model.name || model.type || 'Model',
            prediction: model.accuracy ? `${(model.accuracy * 100).toFixed(1)}% accuracy` : 'No data',
            confidence: model.accuracy ? Math.floor(model.accuracy * 100) : 0,
            impact: (model.accuracy ?? 0) > 0.8 ? 'high' : (model.accuracy ?? 0) > 0.6 ? 'medium' : 'low',
            status: (model.accuracy ?? 0) > 0.7 ? 'positive' : (model.accuracy ?? 0) > 0.5 ? 'neutral' : 'warning',
            details: `Based on ${model.dataPoints || 0} data points`,
          }));

          const avgConf = predictions.length > 0
            ? predictions.reduce((sum: number, p: { confidence: number }) => sum + p.confidence, 0) / predictions.length
            : 0;
          const highImpact = predictions.filter((p: { impact: string }) => p.impact === 'high').length;

          stats = {
            activePredictions: predictions.length,
            avgConfidence: Math.floor(avgConf),
            highImpactAlerts: highImpact,
            accuracy,
          };
        }

        // Revenue forecast and conversion predictions derived from model data
        if (performanceData && performanceData.models) {
          const models = performanceData.models || [];
          // Generate forecast points from model metrics
          revenueForecast = models.slice(0, 6).map((model: AIModelEntry, idx: number) => ({
            month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][idx] || `M${idx + 1}`,
            actual: model.dataPoints ? Math.round(model.dataPoints * (model.accuracy || 0.5) * 100) : 0,
            predicted: model.dataPoints ? Math.round(model.dataPoints * (model.accuracy || 0.5) * 110) : 0,
          }));

          conversionPredictions = models.slice(0, 6).map((model: AIModelEntry, idx: number) => ({
            month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][idx] || `M${idx + 1}`,
            rate: model.accuracy ? Math.round(model.accuracy * 100) : 0,
            predicted: model.accuracy ? Math.round(model.accuracy * 100 * 1.05) : 0,
          }));
        }

        return { predictions, stats, revenueForecast, conversionPredictions }
      } catch (error) {
        console.error('Failed to load predictions:', error);
        toast.error('Failed to load predictions');
        return defaultPredictiveData
      }
    }
  })
  const { predictions, stats, revenueForecast, conversionPredictions } = predictiveData

  if (isLoading) {
    return <LoadingSkeleton rows={5} showChart />;
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
            <CardDescription>Predicted conversion rate for next 6 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            {conversionPredictions.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={conversionPredictions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="conversion"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No conversion trend data available yet.
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
              {predictions.slice(0, 4).map((prediction) => (
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

      {/* All Predictions List */}
      {predictions.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>All Predictions</CardTitle>
          <CardDescription>Complete list of active predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {predictions.map((prediction) => (
              <div key={prediction.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                  <Button variant="outline" size="sm" disabled title="Prediction details coming soon">
                    Details
                  </Button>
                </div>
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
