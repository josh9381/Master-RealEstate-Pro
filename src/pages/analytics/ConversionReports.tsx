import { Activity, TrendingUp, Users, Target, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const ConversionReports = () => {
  const conversionFunnel = [
    { stage: 'Website Visitors', count: 15420, percentage: 100 },
    { stage: 'Lead Captured', count: 4567, percentage: 29.6 },
    { stage: 'Qualified', count: 1203, percentage: 26.3 },
    { stage: 'Proposal Sent', count: 567, percentage: 47.1 },
    { stage: 'Closed Won', count: 234, percentage: 41.3 },
  ];

  const sourceConversion = [
    { source: 'Website Form', leads: 1850, converted: 467, rate: 25.2 },
    { source: 'Email Campaign', leads: 1320, converted: 356, rate: 27.0 },
    { source: 'Social Media', leads: 890, converted: 201, rate: 22.6 },
    { source: 'Referral', leads: 345, converted: 134, rate: 38.8 },
    { source: 'Direct', leads: 162, converted: 76, rate: 46.9 },
  ];

  const timeToConvert = [
    { days: '0-7', count: 89, color: '#10b981' },
    { days: '8-14', count: 67, color: '#3b82f6' },
    { days: '15-21', count: 45, color: '#8b5cf6' },
    { days: '22-30', count: 23, color: '#f59e0b' },
    { days: '30+', count: 10, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conversion Reports</h1>
          <p className="text-muted-foreground mt-2">
            Track conversion rates and funnel performance
          </p>
        </div>
        <Button variant="outline">Export Report</Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Conversion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">26.2%</div>
            <p className="text-xs text-muted-foreground">+3.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time to Convert</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.3 days</div>
            <p className="text-xs text-muted-foreground">-2.1 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Performing</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">46.9%</div>
            <p className="text-xs text-muted-foreground">Direct traffic</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Lead journey from first touch to conversion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversionFunnel.map((stage, index) => (
              <div key={stage.stage}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{stage.stage}</p>
                      <p className="text-sm text-muted-foreground">
                        {stage.count.toLocaleString()} leads
                        {index > 0 && ` • ${stage.percentage}% conversion`}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold">{stage.percentage}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all"
                    style={{ width: `${stage.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Source Conversion */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion by Source</CardTitle>
            <CardDescription>Performance of different lead sources</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sourceConversion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="rate" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {sourceConversion.map((source) => (
                <div key={source.source} className="flex items-center justify-between text-sm">
                  <span>{source.source}</span>
                  <span className="font-medium">
                    {source.converted}/{source.leads} ({source.rate}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Time to Convert */}
        <Card>
          <CardHeader>
            <CardTitle>Time to Convert</CardTitle>
            <CardDescription>How long it takes leads to convert</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={timeToConvert}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ days, count }) => `${days}: ${count}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {timeToConvert.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {timeToConvert.map((item) => (
                <div key={item.days} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span>{item.days} days</span>
                  </div>
                  <span className="font-medium">{item.count} conversions</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConversionReports;
