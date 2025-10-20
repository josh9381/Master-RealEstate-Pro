import { TestTube2, TrendingUp, Users, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const ABTesting = () => {
  const activeTests = [
    {
      id: 1,
      name: 'Subject Line Test - Spring Launch',
      status: 'running',
      created: '2024-01-15',
      variantA: {
        name: 'Variant A: "New Spring Collection is Here!"',
        sent: 2500,
        opened: 875,
        clicked: 218,
        openRate: 35.0,
        clickRate: 8.7,
      },
      variantB: {
        name: 'Variant B: "Your Spring Style Awaits 🌸"',
        sent: 2500,
        opened: 1025,
        clicked: 287,
        openRate: 41.0,
        clickRate: 11.5,
      },
      winner: 'B',
      confidence: 95,
    },
  ];

  const completedTests = [
    {
      id: 2,
      name: 'Call to Action Test',
      completed: '2024-01-12',
      winner: 'Variant B',
      improvement: '+23% CTR',
    },
    {
      id: 3,
      name: 'Send Time Test',
      completed: '2024-01-08',
      winner: 'Variant A',
      improvement: '+15% Open Rate',
    },
  ];

  const performanceData = [
    {
      metric: 'Open Rate',
      variantA: 35.0,
      variantB: 41.0,
    },
    {
      metric: 'Click Rate',
      variantA: 8.7,
      variantB: 11.5,
    },
    {
      metric: 'Conversion',
      variantA: 2.3,
      variantB: 3.2,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">A/B Testing</h1>
          <p className="text-muted-foreground mt-2">
            Compare campaign variations and optimize performance
          </p>
        </div>
        <Button>
          <TestTube2 className="h-4 w-4 mr-2" />
          Create A/B Test
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tests</CardTitle>
            <TestTube2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Improvement</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+18.5%</div>
            <p className="text-xs text-muted-foreground">Winner vs control</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tested</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156,340</div>
            <p className="text-xs text-muted-foreground">Recipients tested</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Tests */}
      {activeTests.map((test) => (
        <Card key={test.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{test.name}</CardTitle>
                <CardDescription>Started {test.created}</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="success">Running</Badge>
                <Button variant="outline" size="sm">
                  Stop Test
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Performance Comparison Chart */}
            <div>
              <h4 className="font-semibold mb-4">Performance Comparison</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="variantA" fill="#3b82f6" name="Variant A" />
                  <Bar dataKey="variantB" fill="#10b981" name="Variant B" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Variant Details */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Variant A */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary">Variant A</Badge>
                  <span className="text-sm text-muted-foreground">
                    {test.variantA.sent.toLocaleString()} sent
                  </span>
                </div>
                <h4 className="font-medium mb-4">{test.variantA.name}</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Opens</span>
                    <span className="font-medium">
                      {test.variantA.opened.toLocaleString()} ({test.variantA.openRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${test.variantA.openRate}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Clicks</span>
                    <span className="font-medium">
                      {test.variantA.clicked.toLocaleString()} ({test.variantA.clickRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${test.variantA.clickRate * 10}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Variant B (Winner) */}
              <div className="p-4 border-2 border-green-500 rounded-lg bg-green-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Badge variant="success">Variant B - Winner</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {test.variantB.sent.toLocaleString()} sent
                  </span>
                </div>
                <h4 className="font-medium mb-4">{test.variantB.name}</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Opens</span>
                    <span className="font-medium">
                      {test.variantB.opened.toLocaleString()} ({test.variantB.openRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${test.variantB.openRate}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Clicks</span>
                    <span className="font-medium">
                      {test.variantB.clicked.toLocaleString()} ({test.variantB.clickRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${test.variantB.clickRate * 10}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistical Significance */}
            <div className="p-4 bg-green-100 border border-green-300 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-green-900">
                    Variant B is winning with {test.confidence}% confidence
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Variant B has +{test.variantB.openRate - test.variantA.openRate}% open rate
                    and +{test.variantB.clickRate - test.variantA.clickRate}% click rate
                  </p>
                </div>
                <Button>Declare Winner</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Completed Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Completed A/B Tests</CardTitle>
          <CardDescription>Recently finished tests and results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {completedTests.map((test) => (
              <div
                key={test.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h4 className="font-semibold">{test.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Completed {test.completed}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <Badge variant="success">{test.winner}</Badge>
                    <p className="text-sm font-medium text-green-600 mt-1">{test.improvement}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create New Test */}
      <Card>
        <CardHeader>
          <CardTitle>Create New A/B Test</CardTitle>
          <CardDescription>Set up a new split test campaign</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Test Name</label>
            <input
              type="text"
              placeholder="e.g., Subject Line Test - Spring Campaign"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">What to Test</label>
            <select className="w-full px-3 py-2 border rounded-lg">
              <option>Subject Line</option>
              <option>From Name</option>
              <option>Email Content</option>
              <option>Call to Action</option>
              <option>Send Time</option>
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Test Duration</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>24 hours</option>
                <option>48 hours</option>
                <option>72 hours</option>
                <option>1 week</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Confidence Level</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>90%</option>
                <option>95%</option>
                <option>99%</option>
              </select>
            </div>
          </div>
          <Button>Create A/B Test</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ABTesting;
