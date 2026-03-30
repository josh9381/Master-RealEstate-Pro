import { logger } from '@/lib/logger'
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TestTube2, TrendingUp, Users, Mail, RefreshCw, Play, Pause, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { useToast } from '@/hooks/useToast';
import * as abtestService from '@/services/abtestService';
import type { ABTestResult, StatisticalAnalysis } from '@/services/abtestService';

const ABTesting = () => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const resetCreateForm = () => {
    setCreateForm({ name: '', testType: 'EMAIL_SUBJECT', variantA: '', variantB: '', duration: '48', confidence: '95' });
    setCreateErrors({});
  };

  const toggleTestExpanded = (testId: string) => {
    setExpandedTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId); else next.add(testId);
      return next;
    });
  };

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    testType: 'EMAIL_SUBJECT' as 'EMAIL_SUBJECT' | 'EMAIL_CONTENT' | 'EMAIL_TIMING' | 'SMS_CONTENT' | 'LANDING_PAGE',
    variantA: '',
    variantB: '',
    duration: '48',
    confidence: '95',
  });

  const { data: abData, isFetching: isLoading, refetch: loadABTests } = useQuery({
    queryKey: ['abTests'],
    queryFn: async () => {
      const allTests = await abtestService.getABTests();

      // Load results for active and completed tests
      const resultsPromises = allTests
        .filter(t => t.status === 'RUNNING' || t.status === 'COMPLETED')
        .map(async (test) => {
          try {
            const results = await abtestService.getABTestResults(test.id);
            return { testId: test.id, data: results };
          } catch (error) {
            logger.error(`Error loading results for test ${test.id}:`, error);
            return null;
          }
        });

      const resultsData = await Promise.allSettled(resultsPromises);
      const resultsMap: Record<string, { results: { variantA: ABTestResult; variantB: ABTestResult }; analysis: StatisticalAnalysis }> = {};
      resultsData.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          resultsMap[result.value.testId] = result.value.data;
        }
      });

      // Calculate stats
      const activeTests = allTests.filter(t => t.status === 'RUNNING').length;
      const completedTests = allTests.filter(t => t.status === 'COMPLETED').length;
      const totalParticipants = allTests.reduce((sum, t) => sum + t.participantCount, 0);

      // Calculate average improvement from completed tests only
      const completedTestIds = new Set(allTests.filter(t => t.status === 'COMPLETED').map(t => t.id));
      const improvements = Object.entries(resultsMap)
        .filter(([testId]) => completedTestIds.has(testId))
        .map(([, r]) => {
          const aRate = r?.results?.variantA?.conversionRate ?? 0;
          const bRate = r?.results?.variantB?.conversionRate ?? 0;
          return Math.abs(bRate - aRate);
        })
        .filter(imp => imp > 0);
      
      const avgImprovement = improvements.length > 0
        ? improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length
        : 0;

      return {
        tests: allTests,
        testResults: resultsMap,
        stats: {
          activeTests,
          completedTests,
          avgImprovement: Math.round(avgImprovement * 10) / 10,
          totalTested: totalParticipants,
        },
      };
    },
    refetchInterval: (query) => {
      const hasActive = (query.state.data?.stats?.activeTests ?? 0) > 0;
      return hasActive ? 30_000 : false;
    },
  });
  const tests = abData?.tests ?? [];
  const testResults = abData?.testResults ?? {};
  const stats = abData?.stats ?? { activeTests: 0, completedTests: 0, avgImprovement: 0, totalTested: 0 };

  const handleStopTest = async (testId: string) => {
    if (actionLoading) return;
    setActionLoading(testId);
    try {
      await abtestService.stopABTest(testId);
      toast.success('Test stopped successfully');
      loadABTests();
    } catch (error) {
      logger.error('Error stopping test:', error);
      toast.error('Failed to stop test');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartTest = async (testId: string) => {
    if (actionLoading) return;
    setActionLoading(testId);
    try {
      await abtestService.startABTest(testId);
      toast.success('Test started successfully');
      loadABTests();
    } catch (error) {
      logger.error('Error starting test:', error);
      toast.error('Failed to start test');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseTest = async (testId: string) => {
    if (actionLoading) return;
    setActionLoading(testId);
    try {
      await abtestService.pauseABTest(testId);
      toast.success('Test paused');
      loadABTests();
    } catch (error) {
      logger.error('Error pausing test:', error);
      toast.error('Failed to pause test');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (actionLoading) return;
    setActionLoading(testId);
    try {
      await abtestService.deleteABTest(testId);
      toast.success('Test deleted');
      loadABTests();
    } catch (error) {
      logger.error('Error deleting test:', error);
      toast.error('Failed to delete test. Only draft tests can be deleted.');
    } finally {
      setActionLoading(null);
    }
  };

  const activeTests = tests.filter(t => t.status === 'RUNNING');
  const completedTests = tests.filter(t => t.status === 'COMPLETED');
  const draftTests = tests.filter(t => t.status === 'DRAFT');
  const pausedTests = tests.filter(t => t.status === 'PAUSED');

  if (isLoading && tests.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-32" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded" />)}
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">A/B Testing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare campaign variations and optimize performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => { loadABTests(); }} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Test
          </Button>
        </div>
      </div>

      {/* Stats — compact row */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Tests</p>
                <p className="text-xl font-bold">{stats.activeTests}</p>
              </div>
              <TestTube2 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-xl font-bold">{stats.completedTests}</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Improvement</p>
                <p className="text-xl font-bold text-emerald-500">+{stats.avgImprovement}%</p>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Tested</p>
                <p className="text-xl font-bold">{stats.totalTested.toLocaleString()}</p>
              </div>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Test Modal */}
      <Dialog open={showCreateForm} onOpenChange={(open) => { setShowCreateForm(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Create New A/B Test</DialogTitle>
            <DialogDescription>Set up a split test to compare campaign variations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Test Name *</label>
              <input
                type="text"
                placeholder="e.g., Subject Line Test - Spring Campaign"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={createForm.name}
                onChange={(e) => { setCreateForm({ ...createForm, name: e.target.value }); if (createErrors.name) setCreateErrors(prev => { const next = {...prev}; delete next.name; return next }) }}
              />
              {createErrors.name && <p className="text-xs text-red-500 mt-1">{createErrors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">What to Test</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={createForm.testType}
                onChange={(e) => setCreateForm({ ...createForm, testType: e.target.value as typeof createForm.testType })}
              >
                <option value="EMAIL_SUBJECT">Subject Line</option>
                <option value="EMAIL_CONTENT">Email Content</option>
                <option value="EMAIL_TIMING">Send Time</option>
                <option value="SMS_CONTENT">SMS Content</option>
                <option value="LANDING_PAGE">Landing Page</option>
              </select>
            </div>
            <div className="grid gap-3 grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Variant A *</label>
                <input
                  type="text"
                  placeholder="Original version"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createForm.variantA}
                  onChange={(e) => { setCreateForm({ ...createForm, variantA: e.target.value }); if (createErrors.variants) setCreateErrors(prev => { const next = {...prev}; delete next.variants; return next }) }}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Variant B *</label>
                <input
                  type="text"
                  placeholder="Alternative version"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createForm.variantB}
                  onChange={(e) => { setCreateForm({ ...createForm, variantB: e.target.value }); if (createErrors.variants) setCreateErrors(prev => { const next = {...prev}; delete next.variants; return next }) }}
                />
              </div>
            </div>
            {createErrors.variants && <p className="text-xs text-red-500">{createErrors.variants}</p>}
            <div className="grid gap-3 grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Duration</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createForm.duration}
                  onChange={(e) => setCreateForm({ ...createForm, duration: e.target.value })}
                >
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="72">72 hours</option>
                  <option value="168">1 week</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Confidence</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createForm.confidence}
                  onChange={(e) => setCreateForm({ ...createForm, confidence: e.target.value })}
                >
                  <option value="90">90%</option>
                  <option value="95">95%</option>
                  <option value="99">99%</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowCreateForm(false); resetCreateForm(); }}>Cancel</Button>
              <Button
                disabled={!createForm.name.trim() || !createForm.variantA.trim() || !createForm.variantB.trim() || isCreating}
                onClick={async () => {
                  const newErrors: Record<string, string> = {};
                  if (!createForm.name.trim()) {
                    newErrors.name = 'Test name is required';
                  }
                  if (!createForm.variantA.trim() || !createForm.variantB.trim()) {
                    newErrors.variants = 'Both variants are required';
                  } else if (createForm.variantA.trim().length < 3 || createForm.variantB.trim().length < 3) {
                    newErrors.variants = 'Variants must be at least 3 characters';
                  } else if (createForm.variantA.trim() === createForm.variantB.trim()) {
                    newErrors.variants = 'Variant A and Variant B must be different';
                  }
                  setCreateErrors(newErrors);
                  if (Object.keys(newErrors).length > 0) {
                    toast.error('Please fix the validation errors');
                    return;
                  }
                  setIsCreating(true);
                  try {
                    await abtestService.createABTest({
                      name: createForm.name,
                      type: createForm.testType,
                      variantA: { subject: createForm.variantA || 'Variant A' },
                      variantB: { subject: createForm.variantB || 'Variant B' },
                      duration: parseInt(createForm.duration),
                      confidenceLevel: parseInt(createForm.confidence),
                    });
                    toast.success('A/B Test created successfully!');
                    setCreateForm({ name: '', testType: 'EMAIL_SUBJECT', variantA: '', variantB: '', duration: '48', confidence: '95' });
                    setShowCreateForm(false);
                    loadABTests();
                  } catch (error) {
                    toast.error('Failed to create A/B test');
                  } finally {
                    setIsCreating(false);
                  }
                }}
              >
                {isCreating ? 'Creating...' : 'Create Test'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Draft Tests */}
      {draftTests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Draft Tests</CardTitle>
            <CardDescription className="text-xs">Ready to start</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {draftTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h4 className="font-semibold">{test.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {test.type.replace(/_/g, ' ')} &middot; Created {new Date(test.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      A: {test.variantA.subject || 'Variant A'} &middot; B: {test.variantB.subject || 'Variant B'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Draft</Badge>
                    <Button size="sm" disabled={actionLoading === test.id} onClick={() => handleStartTest(test.id)}>
                      <Play className="h-3 w-3 mr-1" />
                      Start
                    </Button>
                    <Button variant="outline" size="sm" disabled={actionLoading === test.id} onClick={() => handleDeleteTest(test.id)}>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paused Tests */}
      {pausedTests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Paused Tests</CardTitle>
            <CardDescription className="text-xs">Paused — can be resumed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pausedTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h4 className="font-semibold">{test.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {test.participantCount.toLocaleString()} participants so far
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="warning">Paused</Badge>
                    <Button size="sm" disabled={actionLoading === test.id} onClick={() => handleStartTest(test.id)}>
                      <Play className="h-3 w-3 mr-1" />
                      Resume
                    </Button>
                    <Button variant="outline" size="sm" disabled={actionLoading === test.id} onClick={() => handleStopTest(test.id)}>
                      Stop
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Tests */}
      {activeTests.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-sm text-muted-foreground">No active A/B tests running.{draftTests.length === 0 && ' Create one to get started!'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {activeTests.map((test) => {
          const results = testResults[test.id];
          if (!results) {
            return (
              <Card key={test.id} className="flex items-center justify-center min-h-[180px]">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </Card>
            );
          }

          const { variantA, variantB } = results.results;
          const { analysis } = results;
          const winner = analysis?.winner;
          const isExpanded = expandedTests.has(test.id);
          const totalParticipants = variantA.participantCount + variantB.participantCount;

          const CompactMetric = ({ label, a, b }: { label: string; a: number; b: number }) => (
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium tabular-nums ${a > b ? 'text-blue-500' : ''}`}>{a.toFixed(1)}%</span>
              <span className="text-muted-foreground px-1">{label}</span>
              <span className={`font-medium tabular-nums ${b > a ? 'text-emerald-500' : ''}`}>{b.toFixed(1)}%</span>
            </div>
          );

          return (
            <Card key={test.id} id={`test-${test.id}`} className="flex flex-col">
              {/* Header */}
              <div className="p-3 pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold truncate">{test.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {totalParticipants.toLocaleString()} participants
                    </p>
                  </div>
                  <Badge variant="success" className="text-[10px] shrink-0">Running</Badge>
                </div>
              </div>

              {/* A vs B metrics */}
              <div className="px-3 pt-2 pb-1 flex-1">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                  <span className="font-medium">A</span>
                  <span className="font-medium">B</span>
                </div>
                <div className="space-y-1">
                  <CompactMetric label="Open" a={variantA.openRate} b={variantB.openRate} />
                  <CompactMetric label="Click" a={variantA.clickRate} b={variantB.clickRate} />
                  <CompactMetric label="Conv" a={variantA.conversionRate} b={variantB.conversionRate} />
                </div>

                {/* Status indicator */}
                {analysis?.isSignificant && variantA.participantCount >= 30 && variantB.participantCount >= 30 ? (
                  <div className="mt-2 px-2 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 text-center">
                      {winner} leads · {analysis.confidence?.toFixed(0) ?? '—'}% confidence
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/20">
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">
                      Collecting data ({variantA.participantCount}+{variantB.participantCount} of 60)
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-3 pt-2 border-t mt-auto">
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" disabled={actionLoading === test.id} onClick={() => handlePauseTest(test.id)}>
                    <Pause className="h-3 w-3 mr-1" />
                    Pause
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" disabled={actionLoading === test.id} onClick={() => handleStopTest(test.id)}>
                    Stop
                  </Button>
                  <button
                    onClick={() => toggleTestExpanded(test.id)}
                    className="h-7 w-7 flex items-center justify-center rounded-md border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-2 space-y-2">
                    {[
                      { label: 'Variant A', data: variantA, isWinner: winner === 'A', subject: test.variantA.subject || 'Variant A' },
                      { label: 'Variant B', data: variantB, isWinner: winner === 'B', subject: test.variantB.subject || 'Variant B' },
                    ].map(({ label, data, isWinner, subject }) => (
                      <div key={label} className={`p-2 border rounded text-xs ${isWinner ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant={isWinner ? 'success' : 'secondary'} className="text-[10px]">{label}</Badge>
                          <span className="text-muted-foreground">{data.participantCount} ppl</span>
                        </div>
                        <p className="font-medium truncate mb-1">{subject}</p>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-muted-foreground">
                          <span>Open: <span className="text-foreground font-medium">{data.openRate.toFixed(1)}%</span></span>
                          <span>Click: <span className="text-foreground font-medium">{data.clickRate.toFixed(1)}%</span></span>
                          <span>Reply: <span className="text-foreground font-medium">{data.replyRate.toFixed(1)}%</span></span>
                          <span>Conv: <span className="text-foreground font-medium">{data.conversionRate.toFixed(1)}%</span></span>
                        </div>
                      </div>
                    ))}
                    {analysis?.isSignificant && (
                      <Button size="sm" className="w-full h-7 text-xs" disabled={actionLoading === test.id} onClick={() => handleStopTest(test.id)}>
                        Declare Winner
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
        </div>
      )}

      {/* Completed Tests — collapsible */}
      {completedTests.length > 0 && (
        <Card>
          <button
            onClick={() => setShowCompleted(prev => !prev)}
            className="w-full text-left"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Completed Tests ({completedTests.length})</CardTitle>
                  <CardDescription className="text-xs">Past results</CardDescription>
                </div>
                {showCompleted ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </button>
          {showCompleted && (
            <CardContent className="pt-0">
              <div className="space-y-2">
                {completedTests.map((test) => {
                  const results = testResults[test.id];
                  const winner = test.winnerVariant || test.winnerId || 'N/A';
                  const improvement = results 
                    ? Math.abs(results.results.variantB.conversionRate - results.results.variantA.conversionRate).toFixed(1)
                    : '0';

                  return (
                    <div
                      key={test.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm truncate">{test.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Completed {test.endDate ? new Date(test.endDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <Badge variant="success" className="text-xs">Variant {winner}</Badge>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {parseFloat(improvement) > 0 ? `+${improvement}%` : 'No difference'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};

export default ABTesting;
