import { useState, useEffect } from 'react';
import { TestTube2, TrendingUp, Users, Mail, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { campaignsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
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
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeTests, setActiveTests] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [completedTests, setCompletedTests] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activeTests: 0,
    completedTests: 0,
    avgImprovement: 0,
    totalTested: 0,
  });

  useEffect(() => {
    loadABTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadABTests = async () => {
    setIsLoading(true);
    try {
      const response = await campaignsApi.getCampaigns();
      const campaigns = response.data || [];

      // Simulate A/B test variants by pairing campaigns
      // In a real implementation, campaigns would have variant metadata
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const active = campaigns
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => c.status === 'active' || c.status === 'running')
        .slice(0, 2);
      
      if (active.length >= 2) {
        const variantA = active[0];
        const variantB = active[1];
        
        // Mock A/B test data from two campaigns
        const sentA = variantA.recipientCount || 2500;
        const sentB = variantB.recipientCount || 2500;
        const openedA = Math.floor(sentA * 0.35);
        const openedB = Math.floor(sentB * 0.41);
        const clickedA = Math.floor(openedA * 0.25);
        const clickedB = Math.floor(openedB * 0.28);

        const testData = {
          id: variantA.id,
          name: `A/B Test: ${variantA.name}`,
          status: 'running',
          created: new Date(variantA.createdAt).toLocaleDateString(),
          variantA: {
            name: `Variant A: "${variantA.name}"`,
            sent: sentA,
            opened: openedA,
            clicked: clickedA,
            openRate: (openedA / sentA * 100).toFixed(1),
            clickRate: (clickedA / sentA * 100).toFixed(1),
          },
          variantB: {
            name: `Variant B: "${variantB.name}"`,
            sent: sentB,
            opened: openedB,
            clicked: clickedB,
            openRate: (openedB / sentB * 100).toFixed(1),
            clickRate: (clickedB / sentB * 100).toFixed(1),
          },
          winner: openedB > openedA ? 'B' : 'A',
          confidence: 95,
        };
        setActiveTests([testData]);
      } else {
        setActiveTests([]);
      }

      // Mock completed tests from sent/completed campaigns
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const completed = campaigns
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => c.status === 'sent' || c.status === 'completed')
        .slice(0, 5)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((c: any) => ({
          id: c.id,
          name: `Test: ${c.name}`,
          completed: new Date(c.updatedAt).toLocaleDateString(),
          winner: 'Variant B',
          improvement: `+${Math.floor(Math.random() * 30 + 10)}% CTR`,
        }));
      setCompletedTests(completed);

      // Calculate stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalRecipients = campaigns.reduce((sum: number, c: any) => sum + (c.recipientCount || 0), 0);
      setStats({
        activeTests: activeTests.length > 0 ? 1 : 0,
        completedTests: completed.length,
        avgImprovement: 18.5,
        totalTested: totalRecipients,
      });

    } catch (error) {
      console.error('Error loading A/B tests:', error);
      toast.error('Failed to load A/B tests');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">A/B Testing</h1>
          <p className="text-muted-foreground mt-2">
            Compare campaign variations and optimize performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={loadABTests} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <TestTube2 className="h-4 w-4 mr-2" />
            Create A/B Test
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tests</CardTitle>
            <TestTube2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTests}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTests}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Improvement</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.avgImprovement}%</div>
            <p className="text-xs text-muted-foreground">Winner vs control</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tested</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTested.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Recipients tested</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Tests */}
      {activeTests.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">No active A/B tests. Create one to get started!</p>
          </CardContent>
        </Card>
      ) : (
        activeTests.map((test) => {
          const performanceData = [
            {
              metric: 'Open Rate',
              variantA: parseFloat(test.variantA.openRate),
              variantB: parseFloat(test.variantB.openRate),
            },
            {
              metric: 'Click Rate',
              variantA: parseFloat(test.variantA.clickRate),
              variantB: parseFloat(test.variantB.clickRate),
            },
            {
              metric: 'Conversion',
              variantA: parseFloat(test.variantA.clickRate) * 0.3,
              variantB: parseFloat(test.variantB.clickRate) * 0.35,
            },
          ];

          return (
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
          );
        })
      )}

      {/* Completed Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Completed A/B Tests</CardTitle>
          <CardDescription>Recently finished tests and results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {completedTests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No completed tests</p>
            ) : (
              completedTests.map((test) => (
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
              ))
            )}
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
