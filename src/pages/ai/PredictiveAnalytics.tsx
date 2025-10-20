import { TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
  const revenueForcast = [
    { month: 'Nov', actual: 45000, predicted: null, lower: null, upper: null },
    { month: 'Dec', actual: 52000, predicted: null, lower: null, upper: null },
    { month: 'Jan', actual: 48000, predicted: null, lower: null, upper: null },
    { month: 'Feb', actual: 61000, predicted: null, lower: null, upper: null },
    { month: 'Mar', actual: 55000, predicted: null, lower: null, upper: null },
    { month: 'Apr', actual: 67000, predicted: null, lower: null, upper: null },
    { month: 'May', actual: null, predicted: 72000, lower: 68000, upper: 76000 },
    { month: 'Jun', actual: null, predicted: 78000, lower: 73000, upper: 83000 },
    { month: 'Jul', actual: null, predicted: 85000, lower: 79000, upper: 91000 },
    { month: 'Aug', actual: null, predicted: 92000, lower: 85000, upper: 99000 },
  ];

  const conversionPredictions = [
    { week: 'W1', conversion: 12.5 },
    { week: 'W2', conversion: 14.2 },
    { week: 'W3', conversion: 13.8 },
    { week: 'W4', conversion: 15.6 },
    { week: 'W5', conversion: 16.2 },
    { week: 'W6', conversion: 17.8 },
  ];

  const predictions = [
    {
      id: 1,
      title: 'Revenue Growth',
      prediction: '+23% next quarter',
      confidence: 87,
      impact: 'high',
      status: 'positive',
      details: 'Based on current pipeline and conversion rates',
    },
    {
      id: 2,
      title: 'Churn Risk',
      prediction: '12 accounts at risk',
      confidence: 92,
      impact: 'high',
      status: 'warning',
      details: 'Engagement dropped significantly in past 30 days',
    },
    {
      id: 3,
      title: 'Campaign Performance',
      prediction: 'Email campaign will outperform by 18%',
      confidence: 78,
      impact: 'medium',
      status: 'positive',
      details: 'Similar audience segments showed high engagement',
    },
    {
      id: 4,
      title: 'Lead Quality',
      prediction: 'Expect 89 high-quality leads this month',
      confidence: 84,
      impact: 'high',
      status: 'positive',
      details: 'Seasonal trends and marketing activities aligned',
    },
    {
      id: 5,
      title: 'Resource Needs',
      prediction: 'Need 2 more sales reps by Q3',
      confidence: 73,
      impact: 'medium',
      status: 'neutral',
      details: 'Pipeline growth exceeding current team capacity',
    },
  ];

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
          <Button variant="outline">Configure Models</Button>
          <Button>Run Predictions</Button>
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
            <div className="text-2xl font-bold">856</div>
            <p className="text-xs text-muted-foreground">+124 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">83%</div>
            <p className="text-xs text-muted-foreground">Across all models</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High-Impact Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prediction Accuracy</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">91%</div>
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
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={revenueForcast}>
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
          </CardContent>
        </Card>

        {/* Key Predictions */}
        <Card>
          <CardHeader>
            <CardTitle>Key Predictions</CardTitle>
            <CardDescription>High-confidence predictions requiring action</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* All Predictions List */}
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
                  <Button variant="outline" size="sm">
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictiveAnalytics;
