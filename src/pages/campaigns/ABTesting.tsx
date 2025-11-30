import { useState, useEffect } from 'react';
import { TestTube2, TrendingUp, Users, Mail, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
import * as abtestService from '@/services/abtestService';
import type { ABTest, ABTestResult, StatisticalAnalysis } from '@/services/abtestService';

const ABTesting = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tests, setTests] = useState<ABTest[]>([]);
  const [testResults, setTestResults] = useState<Record<string, {
    results: { variantA: ABTestResult; variantB: ABTestResult };
    analysis: StatisticalAnalysis;
  }>>({});
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
      const allTests = await abtestService.getABTests();
      setTests(allTests);

      // Load results for active and completed tests
      const resultsPromises = allTests
        .filter(t => t.status === 'RUNNING' || t.status === 'COMPLETED')
        .map(async (test) => {
          try {
            const results = await abtestService.getABTestResults(test.id);
            return { testId: test.id, data: results };
          } catch (error) {
            console.error(`Error loading results for test ${test.id}:`, error);
            return null;
          }
        });

      const resultsData = await Promise.all(resultsPromises);
      const resultsMap: Record<string, { results: { variantA: ABTestResult; variantB: ABTestResult }; analysis: StatisticalAnalysis }> = {};
      resultsData.forEach((item) => {
        if (item) {
          resultsMap[item.testId] = item.data;
        }
      });
      setTestResults(resultsMap);

      // Calculate stats
      const activeTests = allTests.filter(t => t.status === 'RUNNING').length;
      const completedTests = allTests.filter(t => t.status === 'COMPLETED').length;
      const totalParticipants = allTests.reduce((sum, t) => sum + t.participantCount, 0);

      // Calculate average improvement from completed tests
      const improvements = Object.values(resultsMap)
        .map(r => {
          const aRate = r.results.variantA.conversionRate;
          const bRate = r.results.variantB.conversionRate;
          return Math.abs(bRate - aRate);
        })
        .filter(imp => imp > 0);
      
      const avgImprovement = improvements.length > 0
        ? improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length
        : 0;

      setStats({
        activeTests,
        completedTests,
        avgImprovement: Math.round(avgImprovement * 10) / 10,
        totalTested: totalParticipants,
      });

    } catch (error) {
      console.error('Error loading A/B tests:', error);
      toast.error('Failed to load A/B tests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTest = async (testId: string) => {
    try {
      await abtestService.stopABTest(testId);
      toast.success('Test stopped successfully');
      loadABTests();
    } catch (error) {
      console.error('Error stopping test:', error);
      toast.error('Failed to stop test');
    }
  };

  const activeTests = tests.filter(t => t.status === 'RUNNING');
  const completedTests = tests.filter(t => t.status === 'COMPLETED');

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
          const results = testResults[test.id];
          if (!results) {
            return (
              <Card key={test.id}>
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">Loading test results...</p>
                </CardContent>
              </Card>
            );
          }

          const { variantA, variantB } = results.results;
          const { analysis } = results;

          const performanceData = [
            {
              metric: 'Open Rate',
              variantA: variantA.openRate,
              variantB: variantB.openRate,
            },
            {
              metric: 'Click Rate',
              variantA: variantA.clickRate,
              variantB: variantB.clickRate,
            },
            {
              metric: 'Conversion',
              variantA: variantA.conversionRate,
              variantB: variantB.conversionRate,
            },
          ];

          const winner = analysis.winner;
          const variantASubject = test.variantA.subject || 'Variant A';
          const variantBSubject = test.variantB.subject || 'Variant B';

          return (
            <Card key={test.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{test.name}</CardTitle>
                    <CardDescription>Started {new Date(test.createdAt).toLocaleDateString()}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="success">Running</Badge>
                    <Button variant="outline" size="sm" onClick={() => handleStopTest(test.id)}>
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
              <div className={`p-4 border rounded-lg ${winner === 'A' ? 'border-2 border-green-500 bg-green-50' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={winner === 'A' ? 'success' : 'secondary'}>
                    Variant A {winner === 'A' ? '- Winner' : ''}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {variantA.participantCount.toLocaleString()} participants
                  </span>
                </div>
                <h4 className="font-medium mb-4">{variantASubject}</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Open Rate</span>
                    <span className="font-medium">
                      {variantA.openRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={winner === 'A' ? 'bg-green-500 h-2 rounded-full' : 'bg-blue-500 h-2 rounded-full'}
                      style={{ width: `${Math.min(variantA.openRate, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Click Rate</span>
                    <span className="font-medium">
                      {variantA.clickRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={winner === 'A' ? 'bg-green-500 h-2 rounded-full' : 'bg-blue-500 h-2 rounded-full'}
                      style={{ width: `${Math.min(variantA.clickRate * 2, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Conversion Rate</span>
                    <span className="font-medium">
                      {variantA.conversionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Variant B */}
              <div className={`p-4 border rounded-lg ${winner === 'B' ? 'border-2 border-green-500 bg-green-50' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={winner === 'B' ? 'success' : 'secondary'}>
                    Variant B {winner === 'B' ? '- Winner' : ''}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {variantB.participantCount.toLocaleString()} participants
                  </span>
                </div>
                <h4 className="font-medium mb-4">{variantBSubject}</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Open Rate</span>
                    <span className="font-medium">
                      {variantB.openRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={winner === 'B' ? 'bg-green-500 h-2 rounded-full' : 'bg-blue-500 h-2 rounded-full'}
                      style={{ width: `${Math.min(variantB.openRate, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Click Rate</span>
                    <span className="font-medium">
                      {variantB.clickRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={winner === 'B' ? 'bg-green-500 h-2 rounded-full' : 'bg-blue-500 h-2 rounded-full'}
                      style={{ width: `${Math.min(variantB.clickRate * 2, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Conversion Rate</span>
                    <span className="font-medium">
                      {variantB.conversionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistical Significance */}
            {analysis.isSignificant ? (
              <div className="p-4 bg-green-100 border border-green-300 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-green-900">
                      Variant {winner} is winning with {analysis.confidence.toFixed(1)}% confidence
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      The difference is statistically significant (p-value: {analysis.pValue.toFixed(4)})
                    </p>
                  </div>
                  <Button onClick={() => handleStopTest(test.id)}>Declare Winner</Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
                <p className="font-semibold text-yellow-900">
                  Not enough data for statistical significance
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Need at least 30 participants per variant. Current: A={variantA.participantCount}, B={variantB.participantCount}
                </p>
              </div>
            )}
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
              completedTests.map((test) => {
                const results = testResults[test.id];
                const winner = test.winnerId || 'N/A';
                const improvement = results 
                  ? Math.abs(results.results.variantB.conversionRate - results.results.variantA.conversionRate).toFixed(1)
                  : '0';

                return (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-semibold">{test.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Completed {test.endDate ? new Date(test.endDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <Badge variant="success">Variant {winner}</Badge>
                        <p className="text-sm font-medium text-green-600 mt-1">+{improvement}% improvement</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => window.location.href = `/campaigns/ab-tests/${test.id}`}>
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })
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
