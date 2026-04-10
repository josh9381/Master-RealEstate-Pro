import { logger } from '@/lib/logger'
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TestTube2, TrendingUp, Users, Mail, RefreshCw, Play, Pause, Trash2,
  ChevronDown, ChevronUp, Plus, Copy, Clock, BarChart3, Trophy,
  Target, MousePointerClick, Eye, MessageSquare, FlaskConical
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { PageEmptyState } from '@/components/ui/PageEmptyState';
import { useToast } from '@/hooks/useToast';
import * as abtestService from '@/services/abtestService';
import type { ABTest, ABTestResult, StatisticalAnalysis } from '@/services/abtestService';
import { campaignsApi } from '@/lib/api/campaigns';
import type { Campaign } from '@/types';

// Minimum participants per variant for statistical significance (matches backend)
const MIN_PARTICIPANTS_PER_VARIANT = 100;

type TabFilter = 'all' | 'active' | 'draft' | 'paused' | 'completed';

const TEST_TYPE_LABELS: Record<string, { label: string; icon: typeof Mail }> = {
  EMAIL_SUBJECT: { label: 'Subject Line', icon: Mail },
  EMAIL_CONTENT: { label: 'Email Content', icon: Mail },
  EMAIL_TIMING: { label: 'Send Time', icon: Clock },
  SMS_CONTENT: { label: 'SMS Content', icon: MessageSquare },
  LANDING_PAGE: { label: 'Landing Page', icon: Target },
};

function formatElapsed(startDate: string | null): string {
  if (!startDate) return '—';
  const start = new Date(startDate).getTime();
  const now = Date.now();
  const hours = Math.floor((now - start) / (1000 * 60 * 60));
  if (hours < 1) return 'Just started';
  if (hours < 24) return `${hours}h elapsed`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h elapsed`;
}

function getVariantLabel(test: ABTest, variant: 'A' | 'B'): string {
  const v = variant === 'A' ? test.variantA : test.variantB;
  return v?.subject || v?.content || v?.sendTime || v?.ctaText || `Variant ${variant}`;
}

function ProgressBar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={`h-1.5 w-full bg-muted rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-primary rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function MetricBar({ label, valueA, valueB, icon: Icon }: {
  label: string; valueA: number; valueB: number;
  icon: typeof Eye;
}) {
  const max = Math.max(valueA, valueB, 0.1);
  const aWins = valueA > valueB;
  const bWins = valueB > valueA;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-muted-foreground">A</span>
            <span className={`text-xs font-semibold tabular-nums ${aWins ? 'text-primary' : 'text-muted-foreground'}`}>
              {valueA.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${aWins ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              style={{ width: `${(valueA / max) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-muted-foreground">B</span>
            <span className={`text-xs font-semibold tabular-nums ${bWins ? 'text-success' : 'text-muted-foreground'}`}>
              {valueB.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${bWins ? 'bg-success' : 'bg-muted-foreground/30'}`}
              style={{ width: `${(valueB / max) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

const ABTesting = () => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  const resetCreateForm = () => {
    setCreateForm({ name: '', description: '', testType: 'EMAIL_SUBJECT', campaignId: '', variantA: '', variantB: '', duration: '48', confidence: '95', winnerMetric: 'open_rate' });
    setCreateErrors({});
  };

  const toggleTestExpanded = (testId: string) => {
    setExpandedTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId); else next.add(testId);
      return next;
    });
  };

  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    testType: 'EMAIL_SUBJECT' as 'EMAIL_SUBJECT' | 'EMAIL_CONTENT' | 'EMAIL_TIMING' | 'SMS_CONTENT' | 'LANDING_PAGE',
    campaignId: '',
    variantA: '',
    variantB: '',
    duration: '48',
    confidence: '95',
    winnerMetric: 'open_rate' as 'open_rate' | 'click_rate' | 'conversion_rate',
  });

  // Map test type to campaign type for filtering
  const campaignTypeForTest = (testType: string): 'EMAIL' | 'SMS' => {
    return testType === 'SMS_CONTENT' ? 'SMS' : 'EMAIL';
  };

  // Whether the test type can auto-populate variant A from a campaign
  const canAutoPopulate = (testType: string) => {
    return ['EMAIL_SUBJECT', 'EMAIL_CONTENT', 'SMS_CONTENT'].includes(testType);
  };

  // Fetch campaigns for the selector
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-for-abtest', createForm.testType],
    queryFn: () => campaignsApi.getCampaigns({ type: campaignTypeForTest(createForm.testType), limit: 100 }),
    enabled: showCreateForm,
  });

  const availableCampaigns: Campaign[] = Array.isArray(campaignsData?.data?.campaigns)
    ? campaignsData.data.campaigns
    : Array.isArray(campaignsData?.campaigns)
      ? campaignsData.campaigns
      : [];

  // Auto-populate variant A when a campaign is selected
  const handleCampaignSelect = (campaignId: string) => {
    const campaign = availableCampaigns.find((c: Campaign) => c.id === campaignId);
    if (!campaign) {
      setCreateForm(prev => ({ ...prev, campaignId: '', variantA: '' }));
      return;
    }
    let variantA = '';
    if (createForm.testType === 'EMAIL_SUBJECT') {
      variantA = campaign.subject || '';
    } else if (createForm.testType === 'EMAIL_CONTENT') {
      variantA = campaign.body || '';
    } else if (createForm.testType === 'SMS_CONTENT') {
      variantA = campaign.body || '';
    }
    setCreateForm(prev => ({ ...prev, campaignId, variantA }));
    if (createErrors.variants) setCreateErrors(prev => { const next = { ...prev }; delete next.variants; return next; });
    if (createErrors.campaign) setCreateErrors(prev => { const next = { ...prev }; delete next.campaign; return next; });
  };

  const { data: abData, isFetching: isLoading, refetch: loadABTests } = useQuery({
    queryKey: ['abTests'],
    queryFn: async () => {
      const allTests = await abtestService.getABTests();

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

      const activeTests = allTests.filter(t => t.status === 'RUNNING').length;
      const completedTests = allTests.filter(t => t.status === 'COMPLETED').length;
      const totalParticipants = allTests.reduce((sum, t) => sum + t.participantCount, 0);

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

  const tests = useMemo(() => abData?.tests ?? [], [abData?.tests]);
  const testResults = abData?.testResults ?? {};
  const stats = abData?.stats ?? { activeTests: 0, completedTests: 0, avgImprovement: 0, totalTested: 0 };

  const filteredTests = useMemo(() => {
    if (activeTab === 'all') return tests;
    const statusMap: Record<string, string> = {
      active: 'RUNNING',
      draft: 'DRAFT',
      paused: 'PAUSED',
      completed: 'COMPLETED',
    };
    return tests.filter(t => t.status === statusMap[activeTab]);
  }, [tests, activeTab]);

  const tabCounts = useMemo(() => ({
    all: tests.length,
    active: tests.filter(t => t.status === 'RUNNING').length,
    draft: tests.filter(t => t.status === 'DRAFT').length,
    paused: tests.filter(t => t.status === 'PAUSED').length,
    completed: tests.filter(t => t.status === 'COMPLETED').length,
  }), [tests]);

  const handleAction = async (testId: string, action: () => Promise<unknown>, successMsg: string, errorMsg: string) => {
    if (actionLoading) return;
    setActionLoading(testId);
    try {
      await action();
      toast.success(successMsg);
      loadABTests();
    } catch (error) {
      logger.error(`Error: ${errorMsg}`, error);
      toast.error(errorMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartTest = (id: string) => handleAction(id, () => abtestService.startABTest(id), 'Test started successfully', 'Failed to start test');
  const handlePauseTest = (id: string) => handleAction(id, () => abtestService.pauseABTest(id), 'Test paused', 'Failed to pause test');
  const handleStopTest = (id: string) => handleAction(id, () => abtestService.stopABTest(id), 'Test stopped successfully', 'Failed to stop test');
  const handleDeleteTest = (id: string) => handleAction(id, () => abtestService.deleteABTest(id), 'Test deleted', 'Failed to delete test. Only draft tests can be deleted.');

  const handleDuplicateTest = async (test: ABTest) => {
    try {
      await abtestService.createABTest({
        name: `${test.name} (Copy)`,
        type: test.type as 'EMAIL_SUBJECT' | 'EMAIL_CONTENT' | 'EMAIL_TIMING' | 'SMS_CONTENT' | 'LANDING_PAGE',
        variantA: test.variantA,
        variantB: test.variantB,
      });
      toast.success('Test duplicated as draft');
      loadABTests();
    } catch {
      toast.error('Failed to duplicate test');
    }
  };

  // Build the correct variant JSON key based on test type
  const getVariantPayload = (value: string) => {
    switch (createForm.testType) {
      case 'EMAIL_SUBJECT': return { subject: value };
      case 'EMAIL_CONTENT': return { content: value };
      case 'EMAIL_TIMING': return { sendTime: value };
      case 'SMS_CONTENT': return { content: value };
      case 'LANDING_PAGE': return { ctaText: value };
      default: return { subject: value };
    }
  };

  const handleCreate = async () => {
    const newErrors: Record<string, string> = {};
    if (!createForm.name.trim()) newErrors.name = 'Test name is required';
    if (canAutoPopulate(createForm.testType) && !createForm.campaignId) {
      newErrors.campaign = 'Please select a campaign to test against';
    }
    if (!createForm.variantA.trim() || !createForm.variantB.trim()) {
      newErrors.variants = 'Both variants are required';
    } else if (createForm.testType === 'LANDING_PAGE') {
      // URL validation for landing pages
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(createForm.variantA.trim()) || !urlPattern.test(createForm.variantB.trim())) {
        newErrors.variants = 'Please enter valid URLs starting with http:// or https://';
      } else if (createForm.variantA.trim() === createForm.variantB.trim()) {
        newErrors.variants = 'Variant A and Variant B must be different';
      }
    } else if (createForm.testType === 'SMS_CONTENT') {
      if (createForm.variantA.trim().length > 160 || createForm.variantB.trim().length > 160) {
        newErrors.variants = 'SMS messages must be 160 characters or fewer';
      } else if (createForm.variantA.trim() === createForm.variantB.trim()) {
        newErrors.variants = 'Variant A and Variant B must be different';
      }
    } else {
      if (createForm.variantA.trim().length < 3 || createForm.variantB.trim().length < 3) {
        newErrors.variants = 'Variants must be at least 3 characters';
      } else if (createForm.variantA.trim() === createForm.variantB.trim()) {
        newErrors.variants = 'Variant A and Variant B must be different';
      }
    }
    setCreateErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsCreating(true);
    try {
      await abtestService.createABTest({
        name: createForm.name,
        description: createForm.description || undefined,
        type: createForm.testType,
        variantA: getVariantPayload(createForm.variantA),
        variantB: getVariantPayload(createForm.variantB),
        duration: parseInt(createForm.duration),
        confidenceLevel: parseInt(createForm.confidence),
      });
      toast.success('A/B Test created successfully!');
      resetCreateForm();
      setShowCreateForm(false);
      loadABTests();
    } catch {
      toast.error('Failed to create A/B test');
    } finally {
      setIsCreating(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<string, { variant: 'default' | 'success' | 'warning' | 'secondary'; label: string }> = {
      RUNNING: { variant: 'success', label: 'Running' },
      COMPLETED: { variant: 'default', label: 'Completed' },
      DRAFT: { variant: 'secondary', label: 'Draft' },
      PAUSED: { variant: 'warning', label: 'Paused' },
    };
    const v = variants[status] ?? { variant: 'secondary' as const, label: status };
    return <Badge variant={v.variant} className="text-[10px]">{v.label}</Badge>;
  };

  if (isLoading && tests.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  const selectedTestData = selectedTest ? tests.find(t => t.id === selectedTest) : null;
  const selectedResults = selectedTest ? testResults[selectedTest] : null;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">A/B Testing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare campaign variations and optimize performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => loadABTests()} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Test
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Active Tests</p>
                <p className="text-2xl font-bold mt-1">{stats.activeTests}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FlaskConical className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Completed</p>
                <p className="text-2xl font-bold mt-1">{stats.completedTests}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Avg Improvement</p>
                <p className="text-2xl font-bold mt-1 text-success">
                  {stats.avgImprovement > 0 ? `+${stats.avgImprovement}%` : '—'}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Tested</p>
                <p className="text-2xl font-bold mt-1">{stats.totalTested.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Filters */}
      <div className="flex items-center gap-1 border-b">
        {(['all', 'active', 'draft', 'paused', 'completed'] as TabFilter[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tabCounts[tab] > 0 && (
              <span className="ml-1.5 text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                {tabCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Test List */}
      {filteredTests.length === 0 ? (
        <PageEmptyState
          icon={<TestTube2 className="h-12 w-12" />}
          title={activeTab === 'all' ? 'No A/B tests yet' : `No ${activeTab} tests`}
          description={
            activeTab === 'all'
              ? 'Create your first A/B test to start comparing campaign variations and optimizing your outreach.'
              : `You don't have any ${activeTab} tests right now.`
          }
          actionLabel={activeTab === 'all' ? 'Create Your First Test' : undefined}
          onAction={activeTab === 'all' ? () => setShowCreateForm(true) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filteredTests.map((test) => {
            const results = testResults[test.id];
            const isExpanded = expandedTests.has(test.id);
            const typeInfo = TEST_TYPE_LABELS[test.type] ?? { label: test.type, icon: Mail };
            const TypeIcon = typeInfo.icon;

            return (
              <Card key={test.id} className="overflow-hidden transition-shadow hover:shadow-md">
                {/* Test Row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() => toggleTestExpanded(test.id)}
                >
                  {/* Icon */}
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                    test.status === 'RUNNING' ? 'bg-primary/10' :
                    test.status === 'COMPLETED' ? 'bg-success/10' :
                    test.status === 'PAUSED' ? 'bg-warning/10' :
                    'bg-muted'
                  }`}>
                    <TypeIcon className={`h-5 w-5 ${
                      test.status === 'RUNNING' ? 'text-primary' :
                      test.status === 'COMPLETED' ? 'text-success' :
                      test.status === 'PAUSED' ? 'text-warning' :
                      'text-muted-foreground'
                    }`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{test.name}</h3>
                      <StatusBadge status={test.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{typeInfo.label}</span>
                      <span>&middot;</span>
                      {test.status === 'RUNNING' && test.startDate ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatElapsed(test.startDate)}
                        </span>
                      ) : test.status === 'COMPLETED' && test.endDate ? (
                        <span>Completed {new Date(test.endDate).toLocaleDateString()}</span>
                      ) : (
                        <span>Created {new Date(test.createdAt).toLocaleDateString()}</span>
                      )}
                      {test.participantCount > 0 && (
                        <>
                          <span>&middot;</span>
                          <span>{test.participantCount.toLocaleString()} participants</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Quick Winner / Metrics Preview */}
                  <div className="hidden md:flex items-center gap-4">
                    {test.status === 'COMPLETED' && test.winnerVariant && (
                      <div className="flex items-center gap-2">
                        <Badge variant={test.winnerVariant === 'TIE' ? 'secondary' : 'success'} className="text-xs">
                          {test.winnerVariant === 'TIE' ? 'Tie' : `Variant ${test.winnerVariant}`}
                        </Badge>
                        {results && (
                          <span className="text-sm font-medium text-success">
                            {(() => {
                              const diff = Math.abs(results.results.variantB.conversionRate - results.results.variantA.conversionRate);
                              return diff > 0 ? `+${diff.toFixed(1)}%` : '';
                            })()}
                          </span>
                        )}
                      </div>
                    )}
                    {test.status === 'RUNNING' && results && (
                      <div className="flex items-center gap-3 text-xs">
                        <div className="text-center">
                          <p className="text-muted-foreground">A</p>
                          <p className="font-semibold text-primary">{results.results.variantA.openRate.toFixed(1)}%</p>
                        </div>
                        <span className="text-muted-foreground">vs</span>
                        <div className="text-center">
                          <p className="text-muted-foreground">B</p>
                          <p className="font-semibold text-success">{results.results.variantB.openRate.toFixed(1)}%</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    {test.status === 'DRAFT' && (
                      <>
                        <Button size="sm" variant="default" className="h-7 text-xs" disabled={actionLoading === test.id}
                          onClick={() => handleStartTest(test.id)}>
                          <Play className="h-3 w-3 mr-1" /> Start
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={actionLoading === test.id}
                          onClick={() => handleDeleteTest(test.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {test.status === 'RUNNING' && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={actionLoading === test.id}
                          onClick={() => handlePauseTest(test.id)}>
                          <Pause className="h-3 w-3 mr-1" /> Pause
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={actionLoading === test.id}
                          onClick={() => handleStopTest(test.id)}>
                          Stop
                        </Button>
                      </>
                    )}
                    {test.status === 'PAUSED' && (
                      <>
                        <Button size="sm" variant="default" className="h-7 text-xs" disabled={actionLoading === test.id}
                          onClick={() => handleStartTest(test.id)}>
                          <Play className="h-3 w-3 mr-1" /> Resume
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={actionLoading === test.id}
                          onClick={() => handleStopTest(test.id)}>
                          Stop
                        </Button>
                      </>
                    )}
                    {(test.status === 'COMPLETED' || test.status === 'PAUSED' || test.status === 'DRAFT') && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" title="Duplicate test"
                        onClick={() => handleDuplicateTest(test)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                    <button
                      onClick={() => toggleTestExpanded(test.id)}
                      className="h-7 w-7 flex items-center justify-center rounded-md border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t bg-muted/30 p-4">
                    {/* Variant Labels */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3 rounded-lg border bg-background">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-5 w-5 rounded bg-blue-500/20 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">A</span>
                          </div>
                          <span className="text-xs font-medium">Variant A</span>
                        </div>
                        <p className="text-sm truncate">{getVariantLabel(test, 'A')}</p>
                      </div>
                      <div className="p-3 rounded-lg border bg-background">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-5 w-5 rounded bg-emerald-500/20 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">B</span>
                          </div>
                          <span className="text-xs font-medium">Variant B</span>
                        </div>
                        <p className="text-sm truncate">{getVariantLabel(test, 'B')}</p>
                      </div>
                    </div>

                    {results ? (
                      <div className="space-y-4">
                        {/* Metrics comparison */}
                        <div className="space-y-3">
                          <MetricBar label="Open Rate" valueA={results.results.variantA.openRate} valueB={results.results.variantB.openRate} icon={Eye} />
                          <MetricBar label="Click Rate" valueA={results.results.variantA.clickRate} valueB={results.results.variantB.clickRate} icon={MousePointerClick} />
                          <MetricBar label="Reply Rate" valueA={results.results.variantA.replyRate} valueB={results.results.variantB.replyRate} icon={MessageSquare} />
                          <MetricBar label="Conversion Rate" valueA={results.results.variantA.conversionRate} valueB={results.results.variantB.conversionRate} icon={Target} />
                        </div>

                        {/* Participant counts & progress */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-xs">
                            <div className="flex justify-between mb-1">
                              <span className="text-muted-foreground">Variant A participants</span>
                              <span className="font-medium">{results.results.variantA.participantCount}</span>
                            </div>
                            <ProgressBar value={results.results.variantA.participantCount} max={MIN_PARTICIPANTS_PER_VARIANT} />
                          </div>
                          <div className="text-xs">
                            <div className="flex justify-between mb-1">
                              <span className="text-muted-foreground">Variant B participants</span>
                              <span className="font-medium">{results.results.variantB.participantCount}</span>
                            </div>
                            <ProgressBar value={results.results.variantB.participantCount} max={MIN_PARTICIPANTS_PER_VARIANT} />
                          </div>
                        </div>

                        {/* Statistical significance */}
                        {results.analysis && (
                          <div className={`p-3 rounded-lg border ${
                            results.analysis.isSignificant
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : 'bg-amber-500/5 border-amber-500/20'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <BarChart3 className={`h-4 w-4 ${
                                  results.analysis.isSignificant ? 'text-emerald-500' : 'text-amber-500'
                                }`} />
                                <span className="text-sm font-medium">
                                  {results.analysis.isSignificant
                                    ? `Statistically significant — Variant ${results.analysis.winner} wins`
                                    : 'Not yet statistically significant'}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {results.analysis.confidence?.toFixed(1) ?? 0}% confidence
                              </span>
                            </div>
                            {!results.analysis.isSignificant && (
                              <p className="text-xs text-muted-foreground mt-1.5">
                                Need at least {MIN_PARTICIPANTS_PER_VARIANT} participants per variant for reliable results.
                                Currently: A={results.results.variantA.participantCount}, B={results.results.variantB.participantCount}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Declare winner button for running tests with significance */}
                        {test.status === 'RUNNING' && results.analysis?.isSignificant && (
                          <Button className="w-full" size="sm" disabled={actionLoading === test.id}
                            onClick={() => handleStopTest(test.id)}>
                            <Trophy className="h-4 w-4 mr-2" />
                            Declare Winner & Complete Test
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        {test.status === 'DRAFT' ? (
                          <div className="space-y-2">
                            <p>Start this test to begin collecting data.</p>
                            <Button size="sm" onClick={() => handleStartTest(test.id)} disabled={actionLoading === test.id}>
                              <Play className="h-3 w-3 mr-1" /> Start Test
                            </Button>
                          </div>
                        ) : (
                          <p>No results data available yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Test Modal */}
      <Dialog open={showCreateForm} onOpenChange={(open) => { setShowCreateForm(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New A/B Test</DialogTitle>
            <DialogDescription>Set up a split test to compare campaign variations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Test Name */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Test Name *</label>
              <input
                type="text"
                placeholder="e.g., Subject Line Test - Spring Campaign"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={createForm.name}
                onChange={(e) => { setCreateForm({ ...createForm, name: e.target.value }); if (createErrors.name) setCreateErrors(prev => { const next = { ...prev }; delete next.name; return next }) }}
              />
              {createErrors.name && <p className="text-xs text-red-500 mt-1">{createErrors.name}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="text"
                placeholder="What's the goal of this test?"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>

            {/* What to Test */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">What to Test</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={createForm.testType}
                onChange={(e) => setCreateForm({ ...createForm, testType: e.target.value as typeof createForm.testType, campaignId: '', variantA: '', variantB: '' })}
              >
                <option value="EMAIL_SUBJECT">Subject Line</option>
                <option value="EMAIL_CONTENT">Email Content</option>
                <option value="EMAIL_TIMING">Send Time</option>
                <option value="SMS_CONTENT">SMS Content</option>
                <option value="LANDING_PAGE">Landing Page</option>
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {createForm.testType === 'EMAIL_SUBJECT' && 'Compare two email subject lines to see which gets more opens.'}
                {createForm.testType === 'EMAIL_CONTENT' && 'Compare two versions of email body content.'}
                {createForm.testType === 'EMAIL_TIMING' && 'Compare two send times to find the optimal delivery window.'}
                {createForm.testType === 'SMS_CONTENT' && 'Compare two SMS messages to see which performs better.'}
                {createForm.testType === 'LANDING_PAGE' && 'Compare two landing page URLs to measure conversion differences.'}
              </p>
            </div>

            {/* Campaign Selector */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Link to Campaign {canAutoPopulate(createForm.testType) ? '*' : <span className="text-muted-foreground font-normal">(optional)</span>}
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={createForm.campaignId}
                onChange={(e) => handleCampaignSelect(e.target.value)}
              >
                <option value="">Select a campaign...</option>
                {availableCampaigns.map((c: Campaign) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.status ? ` (${c.status.toLowerCase()})` : ''}
                  </option>
                ))}
              </select>
              {canAutoPopulate(createForm.testType) ? (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Variant A will be auto-filled from the campaign's {createForm.testType === 'EMAIL_SUBJECT' ? 'subject line' : 'content'}. You provide the alternative for Variant B.
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Optionally link this test to an existing campaign for tracking.
                </p>
              )}
              {createErrors.campaign && <p className="text-xs text-red-500 mt-1">{createErrors.campaign}</p>}
            </div>

            {/* Context-Aware Variant Inputs */}
            <div className="space-y-3">
              {/* Variant A */}
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-5">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">A</span>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1.5 block">
                    Variant A *
                    <span className="text-muted-foreground font-normal ml-1">(Control{createForm.campaignId && canAutoPopulate(createForm.testType) ? ' — from campaign' : ''})</span>
                  </label>
                  {(createForm.testType === 'EMAIL_CONTENT' || createForm.testType === 'SMS_CONTENT') ? (
                    <div>
                      <textarea
                        placeholder={createForm.campaignId ? 'Select a campaign above to auto-fill...' : createForm.testType === 'SMS_CONTENT'
                          ? 'Your first SMS message...'
                          : 'Your original email body content...'}
                        rows={createForm.testType === 'SMS_CONTENT' ? 3 : 4}
                        maxLength={createForm.testType === 'SMS_CONTENT' ? 160 : undefined}
                        readOnly={!!(createForm.campaignId && canAutoPopulate(createForm.testType))}
                        className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none ${createForm.campaignId && canAutoPopulate(createForm.testType) ? 'bg-muted cursor-not-allowed' : ''}`}
                        value={createForm.variantA}
                        onChange={(e) => { if (createForm.campaignId && canAutoPopulate(createForm.testType)) return; setCreateForm({ ...createForm, variantA: e.target.value }); if (createErrors.variants) setCreateErrors(prev => { const next = { ...prev }; delete next.variants; return next }) }}
                      />
                      {createForm.testType === 'SMS_CONTENT' && (
                        <p className={`text-[11px] mt-0.5 text-right ${createForm.variantA.length > 150 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          {createForm.variantA.length}/160
                        </p>
                      )}
                    </div>
                  ) : createForm.testType === 'EMAIL_TIMING' ? (
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={createForm.variantA}
                      onChange={(e) => { setCreateForm({ ...createForm, variantA: e.target.value }); if (createErrors.variants) setCreateErrors(prev => { const next = { ...prev }; delete next.variants; return next }) }}
                    >
                      <option value="">Select time...</option>
                      <option value="6:00 AM">6:00 AM — Early morning</option>
                      <option value="8:00 AM">8:00 AM — Morning commute</option>
                      <option value="10:00 AM">10:00 AM — Mid-morning</option>
                      <option value="12:00 PM">12:00 PM — Lunch break</option>
                      <option value="2:00 PM">2:00 PM — Early afternoon</option>
                      <option value="4:00 PM">4:00 PM — Late afternoon</option>
                      <option value="6:00 PM">6:00 PM — Evening</option>
                      <option value="8:00 PM">8:00 PM — Late evening</option>
                    </select>
                  ) : createForm.testType === 'LANDING_PAGE' ? (
                    <input
                      type="url"
                      placeholder="https://example.com/page-a"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={createForm.variantA}
                      onChange={(e) => { setCreateForm({ ...createForm, variantA: e.target.value }); if (createErrors.variants) setCreateErrors(prev => { const next = { ...prev }; delete next.variants; return next }) }}
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder={createForm.campaignId ? 'Auto-filled from campaign subject line' : 'Your original subject line...'}
                      readOnly={!!(createForm.campaignId && canAutoPopulate(createForm.testType))}
                      className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${createForm.campaignId && canAutoPopulate(createForm.testType) ? 'bg-muted cursor-not-allowed' : ''}`}
                      value={createForm.variantA}
                      onChange={(e) => { if (createForm.campaignId && canAutoPopulate(createForm.testType)) return; setCreateForm({ ...createForm, variantA: e.target.value }); if (createErrors.variants) setCreateErrors(prev => { const next = { ...prev }; delete next.variants; return next }) }}
                    />
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center justify-center">
                <div className="h-px flex-1 bg-border" />
                <span className="px-3 text-xs text-muted-foreground font-medium">vs</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Variant B */}
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-5">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">B</span>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1.5 block">
                    Variant B *
                    <span className="text-muted-foreground font-normal ml-1">(Challenger)</span>
                  </label>
                  {(createForm.testType === 'EMAIL_CONTENT' || createForm.testType === 'SMS_CONTENT') ? (
                    <div>
                      <textarea
                        placeholder={createForm.testType === 'SMS_CONTENT'
                          ? 'Your alternative SMS message...'
                          : 'Your alternative email body content...'}
                        rows={createForm.testType === 'SMS_CONTENT' ? 3 : 4}
                        maxLength={createForm.testType === 'SMS_CONTENT' ? 160 : undefined}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
                        value={createForm.variantB}
                        onChange={(e) => { setCreateForm({ ...createForm, variantB: e.target.value }); if (createErrors.variants) setCreateErrors(prev => { const next = { ...prev }; delete next.variants; return next }) }}
                      />
                      {createForm.testType === 'SMS_CONTENT' && (
                        <p className={`text-[11px] mt-0.5 text-right ${createForm.variantB.length > 150 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          {createForm.variantB.length}/160
                        </p>
                      )}
                    </div>
                  ) : createForm.testType === 'EMAIL_TIMING' ? (
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={createForm.variantB}
                      onChange={(e) => { setCreateForm({ ...createForm, variantB: e.target.value }); if (createErrors.variants) setCreateErrors(prev => { const next = { ...prev }; delete next.variants; return next }) }}
                    >
                      <option value="">Select time...</option>
                      <option value="6:00 AM">6:00 AM — Early morning</option>
                      <option value="8:00 AM">8:00 AM — Morning commute</option>
                      <option value="10:00 AM">10:00 AM — Mid-morning</option>
                      <option value="12:00 PM">12:00 PM — Lunch break</option>
                      <option value="2:00 PM">2:00 PM — Early afternoon</option>
                      <option value="4:00 PM">4:00 PM — Late afternoon</option>
                      <option value="6:00 PM">6:00 PM — Evening</option>
                      <option value="8:00 PM">8:00 PM — Late evening</option>
                    </select>
                  ) : createForm.testType === 'LANDING_PAGE' ? (
                    <input
                      type="url"
                      placeholder="https://example.com/page-b"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={createForm.variantB}
                      onChange={(e) => { setCreateForm({ ...createForm, variantB: e.target.value }); if (createErrors.variants) setCreateErrors(prev => { const next = { ...prev }; delete next.variants; return next }) }}
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="Your alternative subject line..."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={createForm.variantB}
                      onChange={(e) => { setCreateForm({ ...createForm, variantB: e.target.value }); if (createErrors.variants) setCreateErrors(prev => { const next = { ...prev }; delete next.variants; return next }) }}
                    />
                  )}
                </div>
              </div>
              {createErrors.variants && <p className="text-xs text-red-500 pl-11">{createErrors.variants}</p>}
            </div>

            {/* Winner Metric + Duration + Confidence */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Optimize For</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={createForm.winnerMetric}
                onChange={(e) => setCreateForm({ ...createForm, winnerMetric: e.target.value as typeof createForm.winnerMetric })}
              >
                <option value="open_rate">Open Rate — best for subject line &amp; timing tests</option>
                <option value="click_rate">Click Rate — best for content &amp; landing page tests</option>
                <option value="conversion_rate">Conversion Rate — best for end-to-end comparison</option>
              </select>
            </div>

            <div className="grid gap-3 grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Duration</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={createForm.duration}
                  onChange={(e) => setCreateForm({ ...createForm, duration: e.target.value })}
                >
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="72">72 hours</option>
                  <option value="168">1 week</option>
                  <option value="336">2 weeks</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Confidence Level</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={createForm.confidence}
                  onChange={(e) => setCreateForm({ ...createForm, confidence: e.target.value })}
                >
                  <option value="90">90%</option>
                  <option value="95">95% (recommended)</option>
                  <option value="99">99%</option>
                </select>
              </div>
            </div>

            {/* Info note */}
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p>Tests need at least <strong>{MIN_PARTICIPANTS_PER_VARIANT}</strong> participants per variant to reach statistical significance.</p>
              <p>Traffic is split 50/50 between variants. The test will be created as a draft — start it when ready.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowCreateForm(false); resetCreateForm(); }}>Cancel</Button>
              <Button
                disabled={!createForm.name.trim() || !createForm.variantA.trim() || !createForm.variantB.trim() || (canAutoPopulate(createForm.testType) && !createForm.campaignId) || isCreating}
                onClick={handleCreate}
              >
                {isCreating ? 'Creating...' : 'Create Test'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Detail Modal */}
      <Dialog open={!!selectedTest} onOpenChange={(open) => { if (!open) setSelectedTest(null); }}>
        <DialogContent className="max-w-2xl w-full">
          {selectedTestData && (
            <>
              <DialogHeader>
                <DialogTitle>
                  <span className="flex items-center gap-2">
                    {selectedTestData.name}
                    <StatusBadge status={selectedTestData.status} />
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {TEST_TYPE_LABELS[selectedTestData.type]?.label || selectedTestData.type} test
                  {selectedTestData.endDate && ` · Completed ${new Date(selectedTestData.endDate).toLocaleDateString()}`}
                </DialogDescription>
              </DialogHeader>
              {selectedResults ? (
                <div className="space-y-4 mt-2">
                  {selectedTestData.winnerVariant && selectedTestData.winnerVariant !== 'TIE' && (
                    <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <Trophy className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                      <p className="font-semibold">Variant {selectedTestData.winnerVariant} Wins!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        With {selectedTestData.confidence?.toFixed(1)}% confidence
                      </p>
                    </div>
                  )}
                  <div className="space-y-3">
                    <MetricBar label="Open Rate" valueA={selectedResults.results.variantA.openRate} valueB={selectedResults.results.variantB.openRate} icon={Eye} />
                    <MetricBar label="Click Rate" valueA={selectedResults.results.variantA.clickRate} valueB={selectedResults.results.variantB.clickRate} icon={MousePointerClick} />
                    <MetricBar label="Reply Rate" valueA={selectedResults.results.variantA.replyRate} valueB={selectedResults.results.variantB.replyRate} icon={MessageSquare} />
                    <MetricBar label="Conversion" valueA={selectedResults.results.variantA.conversionRate} valueB={selectedResults.results.variantB.conversionRate} icon={Target} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(['A', 'B'] as const).map(v => {
                      const data = v === 'A' ? selectedResults.results.variantA : selectedResults.results.variantB;
                      const isWinner = selectedTestData.winnerVariant === v;
                      return (
                        <div key={v} className={`p-3 rounded-lg border ${isWinner ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}>
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={isWinner ? 'success' : 'secondary'}>Variant {v}</Badge>
                            {isWinner && <Trophy className="h-4 w-4 text-emerald-500" />}
                          </div>
                          <p className="text-sm font-medium mb-2 truncate">{getVariantLabel(selectedTestData, v)}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>Participants: <span className="text-foreground font-medium">{data.participantCount}</span></div>
                            <div>Open: <span className="text-foreground font-medium">{data.openRate.toFixed(1)}%</span></div>
                            <div>Click: <span className="text-foreground font-medium">{data.clickRate.toFixed(1)}%</span></div>
                            <div>Conv: <span className="text-foreground font-medium">{data.conversionRate.toFixed(1)}%</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No results data available.</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ABTesting;
