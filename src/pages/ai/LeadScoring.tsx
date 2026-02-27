import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Target, TrendingUp, AlertCircle, Settings, RefreshCw, Save, RotateCcw, X, Upload, Activity, CheckCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { leadsApi, aiApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

type ScoringTab = 'scores' | 'charts' | 'training';

interface ModelPerformanceEntry {
  month: string;
  accuracy: number;
  predictions: number;
}

interface FeatureImportanceEntry {
  name: string;
  value: number;
  color?: string;
}

interface TrainingModel {
  id?: string;
  name: string;
  status: string;
  accuracy?: number;
  lastTrained?: string;
  progress?: number;
  eta?: string;
}

interface DataQualityEntry {
  metric: string;
  score: number;
  status: string;
}

interface OptimizationHistoryEntry {
  id?: string;
  modelType?: string;
  accuracyBefore: number | null;
  accuracyAfter: number;
  sampleSize: number;
  improvements?: string[] | null;
  trainingDuration?: number | null;
  date: string;
  user?: string;
}

const LeadScoring = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showConfig, setShowConfig] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const breakdownRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<ScoringTab>('scores')
  const [uploading, setUploading] = useState(false)

  // Score factors breakdown query
  const { data: factorBreakdown, isLoading: factorsLoading } = useQuery({
    queryKey: ['score-factors', selectedLeadId],
    queryFn: () => aiApi.getLeadScoreFactors(selectedLeadId!),
    enabled: !!selectedLeadId,
  })

  // Scroll breakdown panel into view when a lead is selected
  useEffect(() => {
    if (selectedLeadId && breakdownRef.current) {
      breakdownRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedLeadId, factorsLoading])

  // Scoring config query
  const { data: scoringConfig, isLoading: configLoading } = useQuery({
    queryKey: ['scoring-config'],
    queryFn: () => aiApi.getScoringConfig(),
    enabled: showConfig,
  })

  // Charts & training data queries (loaded when charts/training tab is active)
  const { data: chartsData } = useQuery({
    queryKey: ['lead-scoring', 'charts'],
    queryFn: async () => {
      const [perfData, importanceData, qualityData] = await Promise.all([
        aiApi.getModelPerformance(6),
        aiApi.getFeatureImportance('lead-scoring'),
        aiApi.getDataQuality(),
      ])
      // perfData.data may have { history, currentModels, summary } or be a flat array
      const perfResult = perfData.data || {}
      const history = Array.isArray(perfResult) ? perfResult : (perfResult.history || [])
      const optimizationHistory = (Array.isArray(history) ? history : []) as OptimizationHistoryEntry[]
      // Build chart-friendly model performance from history entries
      const modelPerformance = optimizationHistory.map((h: OptimizationHistoryEntry) => ({
        month: new Date(h.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        accuracy: h.accuracyAfter ? Math.round(h.accuracyAfter * 100) : 0,
        predictions: h.sampleSize || 0,
      })).reverse()
      return {
        modelPerformance: modelPerformance as ModelPerformanceEntry[],
        featureImportance: (importanceData.data || []) as FeatureImportanceEntry[],
        dataQuality: (qualityData.data || []) as DataQualityEntry[],
        optimizationHistory,
      }
    },
    enabled: activeTab === 'charts',
  })

  const { data: trainingData, refetch: refetchTraining } = useQuery({
    queryKey: ['lead-scoring', 'training'],
    queryFn: async () => {
      const res = await aiApi.getTrainingModels()
      return (res.data || []) as TrainingModel[]
    },
    enabled: activeTab === 'training',
  })

  const handleUploadData = async () => {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.csv,.json'
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setUploading(true)
      try {
        const text = await file.text()
        const data = file.name.endsWith('.json') ? JSON.parse(text) : text
        await aiApi.uploadTrainingData({
          modelType: 'lead-scoring',
          data: Array.isArray(data) ? data : [data]
        })
        toast.success('Training data uploaded successfully!')
        refetchTraining()
      } catch {
        toast.error('Failed to upload training data')
      } finally {
        setUploading(false)
      }
    }
    fileInput.click()
  }

  const [configForm, setConfigForm] = useState<Record<string, number>>({})

  const initConfigForm = (data: Record<string, unknown>) => {
    setConfigForm({
      emailOpenWeight: (data.emailOpenWeight as number) ?? 5,
      emailClickWeight: (data.emailClickWeight as number) ?? 10,
      emailReplyWeight: (data.emailReplyWeight as number) ?? 15,
      formSubmissionWeight: (data.formSubmissionWeight as number) ?? 20,
      propertyInquiryWeight: (data.propertyInquiryWeight as number) ?? 25,
      scheduledApptWeight: (data.scheduledApptWeight as number) ?? 30,
      completedApptWeight: (data.completedApptWeight as number) ?? 40,
      emailOptOutPenalty: (data.emailOptOutPenalty as number) ?? -50,
      recencyBonusMax: (data.recencyBonusMax as number) ?? 20,
      frequencyBonusMax: (data.frequencyBonusMax as number) ?? 15,
    })
  }

  const saveConfigMutation = useMutation({
    mutationFn: (config: Record<string, number>) => aiApi.updateScoringConfig(config),
    onSuccess: () => {
      toast.success('Scoring configuration saved')
      queryClient.invalidateQueries({ queryKey: ['scoring-config'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save configuration')
    },
  })

  const resetConfigMutation = useMutation({
    mutationFn: () => aiApi.resetScoringConfig(),
    onSuccess: (data) => {
      toast.success('Scoring configuration reset to defaults')
      initConfigForm(data.data || {})
      queryClient.invalidateQueries({ queryKey: ['scoring-config'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to reset configuration')
    },
  })

  // Initialize form when config loads
  useEffect(() => {
    if (scoringConfig?.data && Object.keys(configForm).length === 0) {
      initConfigForm(scoringConfig.data)
    }
  }, [scoringConfig])

  const getScoreGrade = (score: number): string => {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C'
    if (score >= 50) return 'D'
    return 'F'
  }

  const defaultScoreFactors = [
    { factor: 'Email Engagement', weight: 25, impact: 'High' },
    { factor: 'Company Size', weight: 20, impact: 'High' },
    { factor: 'Budget Indicated', weight: 18, impact: 'High' },
    { factor: 'Website Visits', weight: 15, impact: 'Medium' },
    { factor: 'Industry Match', weight: 12, impact: 'Medium' },
    { factor: 'Job Title', weight: 10, impact: 'Low' },
  ]

  const defaultScoringData = {
    scoringStats: { accuracy: 0, leadsScored: 0, highQuality: 0 },
    recentScores: [] as Array<{ id: string | number; name: string; email: string; company: string; score: number; grade: string; confidence: number | null; trend: string }>,
    scoreFactors: defaultScoreFactors,
    modelStatus: 'active',
  }

  const { data: scoringData = defaultScoringData, isLoading: loading, refetch } = useQuery({
    queryKey: ['lead-scoring'],
    queryFn: async () => {
      try {
        const leadsResponse = await leadsApi.getLeads({ 
          sortBy: 'score',
          sortOrder: 'desc',
          limit: 100
        })
        
        const scoredLeads = leadsResponse.data?.leads?.map((lead: { id: string; firstName?: string; lastName?: string; email: string; company?: string; score?: number }) => {
          const score = lead.score || 0
          const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown'
          return {
            id: lead.id,
            name: fullName,
            email: lead.email,
            company: lead.company || 'N/A',
            score,
            grade: getScoreGrade(score),
            confidence: null as number | null, // No distinct confidence field from API
            trend: score >= 80 ? 'up' : score >= 60 ? 'stable' : 'down'
          }
        }) || []
        const totalLeads = leadsResponse.data?.total || scoredLeads.length
        
        const highQualityCount = scoredLeads.filter((l: { score: number }) => l.score >= 80).length
        let scoringStats = {
          accuracy: 0,
          leadsScored: totalLeads,
          highQuality: highQualityCount,
        }
        
        let modelStatus = 'active'
        try {
          const perfData = await aiApi.getModelPerformance()
          const perfModels = perfData?.data || []
          if (Array.isArray(perfModels) && perfModels.length > 0 && perfModels[0]?.accuracy) {
            scoringStats = { ...scoringStats, accuracy: Math.floor(perfModels[0].accuracy * 100) }
          }
          if (perfData?.data?.status) {
            modelStatus = perfData.data.status
          }
        } catch (err) {
          console.error('Failed to load model performance:', err)
          toast.error('Failed to load model performance data')
        }
        
        let scoreFactors = defaultScoreFactors
        try {
          const featureData = await aiApi.getFeatureImportance()
          const features = featureData?.data || []
          if (Array.isArray(features) && features.length > 0) {
            scoreFactors = features.map((f: { name: string; value: number }) => ({
              factor: f.name,
              weight: f.value,
              impact: f.value > 20 ? 'High' : f.value > 10 ? 'Medium' : 'Low'
            }))
          }
        } catch (err) {
          console.error('Failed to load feature importance:', err)
          toast.error('Failed to load feature importance data')
        }

        return { scoringStats, recentScores: scoredLeads, scoreFactors, modelStatus }
      } catch (error) {
        const err = error as Error
        toast.error(err.message || 'Failed to load scoring data')
        return defaultScoringData
      }
    }
  })
  const { scoringStats, recentScores, scoreFactors, modelStatus } = scoringData

  const handleRecalculateScores = async () => {
    try {
      await aiApi.recalculateScores()
      toast.success('Score recalculation initiated')
      // Reload data after a short delay
      setTimeout(() => refetch(), 2000)
    } catch (error) {
      const err = error as Error
      toast.error(err.message || 'Failed to recalculate scores')
    }
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'destructive';
  };

  if (loading) {
    return <LoadingSkeleton rows={5} showChart />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/ai')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Lead Scoring & Models</h1>
            <p className="text-muted-foreground mt-1">
              AI-powered lead quality prediction, model config, and training
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => {
            setShowConfig(!showConfig)
            if (!showConfig && scoringConfig?.data) {
              initConfigForm(scoringConfig.data)
            }
          }}>
            <Settings className="h-4 w-4 mr-2" />
            {showConfig ? 'Close Config' : 'Configure Model'}
          </Button>
          <Button onClick={handleRecalculateScores} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
            Recalculate Scores
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b">
        {[
          { id: 'scores' as ScoringTab, label: 'Scores & Config' },
          { id: 'charts' as ScoringTab, label: 'Model Performance' },
          { id: 'training' as ScoringTab, label: 'Training & Data' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scoring Configuration Panel */}
      {showConfig && activeTab === 'scores' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Scoring Model Configuration</CardTitle>
              <CardDescription>
                Adjust the weight of each scoring factor. Higher values mean more influence on the final score.
                {scoringConfig?.data?.updatedBy && (
                  <span className="block mt-1 text-xs">
                    Last updated by {scoringConfig.data.updatedBy}
                    {scoringConfig.data.updatedAt && ` on ${new Date(scoringConfig.data.updatedAt).toLocaleDateString()}`}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowConfig(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {configLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading configuration...</span>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    { key: 'emailOpenWeight', label: 'Email Opens', defaultVal: 5, max: 50 },
                    { key: 'emailClickWeight', label: 'Email Clicks', defaultVal: 10, max: 50 },
                    { key: 'emailReplyWeight', label: 'Email Replies', defaultVal: 15, max: 50 },
                    { key: 'formSubmissionWeight', label: 'Form Submissions', defaultVal: 20, max: 60 },
                    { key: 'propertyInquiryWeight', label: 'Property Inquiries', defaultVal: 25, max: 60 },
                    { key: 'scheduledApptWeight', label: 'Scheduled Appointments', defaultVal: 30, max: 80 },
                    { key: 'completedApptWeight', label: 'Completed Appointments', defaultVal: 40, max: 100 },
                    { key: 'recencyBonusMax', label: 'Recency Bonus (max)', defaultVal: 20, max: 50 },
                    { key: 'frequencyBonusMax', label: 'Frequency Bonus (max)', defaultVal: 15, max: 50 },
                  ].map(({ key, label, max }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">{label}</label>
                        <span className="text-sm font-bold tabular-nums w-8 text-right">
                          {configForm[key] ?? 0}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={max}
                        step={1}
                        value={configForm[key] ?? 0}
                        onChange={(e) => setConfigForm(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                        className="w-full accent-primary"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0</span>
                        <span>{max}</span>
                      </div>
                    </div>
                  ))}
                  {/* Email opt-out penalty (negative) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Email Opt-Out Penalty</label>
                      <span className="text-sm font-bold tabular-nums w-10 text-right text-red-600">
                        {configForm.emailOptOutPenalty ?? -50}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-200}
                      max={0}
                      step={5}
                      value={configForm.emailOptOutPenalty ?? -50}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, emailOptOutPenalty: Number(e.target.value) }))}
                      className="w-full accent-red-500"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>-200</span>
                      <span>0</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetConfigMutation.mutate()}
                    disabled={resetConfigMutation.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset to Defaults
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveConfigMutation.mutate(configForm)}
                    disabled={saveConfigMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {saveConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Model Status */}
      {activeTab === 'scores' && (<>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Model Status</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={modelStatus === 'active' ? 'success' : 'warning'}>
              {modelStatus === 'active' ? 'Active' : 'Training'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">Scoring model</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Model Accuracy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scoringStats.accuracy > 0 ? `${scoringStats.accuracy}%` : '—'}</div>
            <p className="text-xs text-muted-foreground">{scoringStats.accuracy > 0 ? 'From model data' : 'Not yet calculated'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Scored</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scoringStats.leadsScored.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High-Quality Leads</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scoringStats.highQuality}</div>
            <p className="text-xs text-muted-foreground">Score ≥ 80</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Scoring Factors */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Scoring Factors</CardTitle>
            <CardDescription>Weights used in the scoring model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scoreFactors.map((factor, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{factor.factor}</span>
                    <Badge variant="outline">{factor.weight}%</Badge>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${factor.weight * 4}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Impact: {factor.impact}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recently Scored Leads */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recently Scored Leads</CardTitle>
            <CardDescription>Latest lead scoring results</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentScores.map((lead: { id: string | number; name: string; email: string; company: string; score: number; grade: string; confidence: number | null; trend: string }) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-muted-foreground">{lead.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{lead.company}</TableCell>
                    <TableCell>
                      <Badge variant={getScoreBadgeVariant(lead.score)}>{lead.score}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{lead.grade}</span>
                    </TableCell>
                    <TableCell>{lead.confidence != null ? `${lead.confidence}%` : '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {lead.trend === 'up' && (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        )}
                        {lead.trend === 'down' && (
                          <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                        )}
                        {lead.trend === 'stable' && <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedLeadId(String(lead.id))}>
                          Score Breakdown
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/leads/${lead.id}`)}>
                          View Lead
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Score Factor Breakdown Panel */}
      {selectedLeadId && (
        <Card ref={breakdownRef}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Score Factor Breakdown</CardTitle>
              <CardDescription>
                Detailed breakdown of how this lead's score is calculated
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedLeadId(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {factorsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading score breakdown...</span>
              </div>
            ) : factorBreakdown?.data ? (
              <div className="space-y-6">
                {/* Summary */}
                <div className="flex items-center gap-4 pb-4 border-b">
                  <div>
                    <span className="text-sm text-muted-foreground">Final Score</span>
                    <div className="text-3xl font-bold">{factorBreakdown.data.finalScore}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Raw Total</span>
                    <div className="text-xl font-medium text-muted-foreground">{factorBreakdown.data.rawTotal}</div>
                  </div>
                  {factorBreakdown.data.recencyLabel && (
                    <div>
                      <span className="text-sm text-muted-foreground">Activity Recency</span>
                      <div className="text-sm font-medium">{factorBreakdown.data.recencyLabel}</div>
                    </div>
                  )}
                </div>

                {/* Component bars */}
                <div className="space-y-3">
                  {factorBreakdown.data.components?.map((c: { name: string; count: number; weight: number; points: number }, i: number) => {
                    const maxPoints = 50 // Scale bar to reasonable max
                    const barWidth = Math.min(100, Math.abs(c.points) / maxPoints * 100)
                    const isNegative = c.points < 0
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{c.name}</span>
                          <span className={`font-bold tabular-nums ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                            {isNegative ? '' : '+'}{c.points.toFixed(1)} pts
                            {c.count > 1 && <span className="text-muted-foreground font-normal"> ({c.count} × {c.weight})</span>}
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${isNegative ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Raw factors */}
                {factorBreakdown.data.factors && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Raw Activity Data (Last 90 Days)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {Object.entries(factorBreakdown.data.factors).map(([key, value]) => (
                        <div key={key} className="bg-muted/50 rounded p-2">
                          <span className="text-muted-foreground text-xs">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <div className="font-medium">{String(value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No breakdown data available.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
          <CardDescription>Distribution of lead scores across all leads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(() => {
              const total = recentScores.length
              if (total === 0) {
                return <p className="text-sm text-muted-foreground">No scored leads yet.</p>
              }
              const aCount = recentScores.filter((l: { score: number }) => l.score >= 80).length
              const bCount = recentScores.filter((l: { score: number }) => l.score >= 60 && l.score < 80).length
              const cCount = recentScores.filter((l: { score: number }) => l.score >= 40 && l.score < 60).length
              const dCount = recentScores.filter((l: { score: number }) => l.score < 40).length
              const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0
              const grades = [
                { label: 'A Grade (80-100)', count: aCount, color: 'bg-green-500' },
                { label: 'B Grade (60-79)', count: bCount, color: 'bg-blue-500' },
                { label: 'C Grade (40-59)', count: cCount, color: 'bg-yellow-500' },
                { label: 'D Grade (0-39)', count: dCount, color: 'bg-red-500' },
              ]
              return grades.map(g => (
                <div key={g.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{g.label}</span>
                    <span className="text-sm text-muted-foreground">{g.count} leads ({pct(g.count)}%)</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div className={`${g.color} h-3 rounded-full`} style={{ width: `${pct(g.count)}%` }} />
                  </div>
                </div>
              ))
            })()}
          </div>
        </CardContent>
      </Card>
      </>)}

      {/* Charts & Model Performance Tab */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          {/* Model Accuracy Trend */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Model Accuracy Trend</CardTitle>
                <CardDescription>Prediction accuracy over time</CardDescription>
              </CardHeader>
              <CardContent>
                {chartsData?.modelPerformance && chartsData.modelPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartsData.modelPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No performance data available yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Importance</CardTitle>
                <CardDescription>Factors affecting lead score predictions</CardDescription>
              </CardHeader>
              <CardContent>
                {chartsData?.featureImportance && chartsData.featureImportance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={chartsData.featureImportance}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartsData.featureImportance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][index % 6]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No feature importance data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data Quality Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Data Quality Metrics</CardTitle>
              <CardDescription>Quality assessment of training data</CardDescription>
            </CardHeader>
            <CardContent>
              {chartsData?.dataQuality && chartsData.dataQuality.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-4">
                  {chartsData.dataQuality.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.metric}</span>
                        {item.status === 'excellent' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : item.status === 'good' ? (
                          <CheckCircle className="h-4 w-4 text-blue-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full ${
                            item.status === 'excellent' ? 'bg-green-500' : item.status === 'good' ? 'bg-blue-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold">{item.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data quality metrics available</p>
              )}
            </CardContent>
          </Card>

          {/* Monthly Prediction Volume */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Predictions</CardTitle>
              <CardDescription>Total predictions generated per month</CardDescription>
            </CardHeader>
            <CardContent>
              {chartsData?.modelPerformance && chartsData.modelPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartsData.modelPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="predictions" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">No prediction data available</p>
              )}
            </CardContent>
          </Card>

          {/* Optimization History */}
          <Card>
            <CardHeader>
              <CardTitle>Optimization History</CardTitle>
              <CardDescription>Past recalibrations showing accuracy improvements over time</CardDescription>
            </CardHeader>
            <CardContent>
              {chartsData?.optimizationHistory && chartsData.optimizationHistory.length > 0 ? (
                <div className="space-y-3">
                  {chartsData.optimizationHistory.slice(0, 10).map((entry, index) => {
                    const accuracyBefore = entry.accuracyBefore != null ? (entry.accuracyBefore * 100).toFixed(1) : null
                    const accuracyAfter = (entry.accuracyAfter * 100).toFixed(1)
                    const improved = entry.accuracyBefore != null && entry.accuracyAfter > entry.accuracyBefore
                    const change = entry.accuracyBefore != null
                      ? ((entry.accuracyAfter - entry.accuracyBefore) * 100).toFixed(1)
                      : null
                    return (
                      <div key={entry.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${improved ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                            {improved ? <TrendingUp className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {entry.modelType === 'lead_scoring' ? 'Lead Scoring' : entry.modelType || 'Model'} Recalibration
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString()} {entry.user && `by ${entry.user}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            {accuracyBefore && (
                              <span className="text-muted-foreground">{accuracyBefore}%</span>
                            )}
                            {accuracyBefore && <span className="mx-1 text-muted-foreground">&rarr;</span>}
                            <span className="font-bold">{accuracyAfter}%</span>
                          </div>
                          {change && (
                            <Badge variant={improved ? 'success' : 'secondary'}>
                              {improved ? '+' : ''}{change}%
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {entry.sampleSize} samples
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No optimization history yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Recalibrate your model to see history here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Training & Data Tab */}
      {activeTab === 'training' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Model Training</CardTitle>
                  <CardDescription>Active training sessions and history</CardDescription>
                </div>
                <Button onClick={handleUploadData} disabled={uploading}>
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload Training Data'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {trainingData && trainingData.length > 0 ? (
                <div className="space-y-4">
                  {trainingData.map((model, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{model.name}</span>
                          <Badge
                            variant={
                              model.status === 'complete' ? 'success' : model.status === 'training' ? 'default' : 'secondary'
                            }
                          >
                            {model.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {model.eta ? `ETA: ${model.eta}` : model.lastTrained ? `Last trained: ${model.lastTrained}` : ''}
                        </span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full transition-all ${model.status === 'complete' ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${model.progress || 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{model.progress || 0}% complete</span>
                        {model.status === 'training' && (
                          <span className="flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Training...
                          </span>
                        )}
                        {model.accuracy && (
                          <span>Accuracy: {typeof model.accuracy === 'number' ? `${(model.accuracy * 100).toFixed(1)}%` : model.accuracy}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No training models yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Upload training data to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LeadScoring;
