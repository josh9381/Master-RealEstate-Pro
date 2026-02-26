import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Target, TrendingUp, AlertCircle, Settings, RefreshCw, Save, RotateCcw, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { leadsApi, aiApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

const LeadScoring = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showConfig, setShowConfig] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  // Score factors breakdown query
  const { data: factorBreakdown, isLoading: factorsLoading } = useQuery({
    queryKey: ['score-factors', selectedLeadId],
    queryFn: () => aiApi.getLeadScoreFactors(selectedLeadId!),
    enabled: !!selectedLeadId,
  })

  // Scoring config query
  const { data: scoringConfig, isLoading: configLoading } = useQuery({
    queryKey: ['scoring-config'],
    queryFn: () => aiApi.getScoringConfig(),
    enabled: showConfig,
  })

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
        <div>
          <h1 className="text-3xl font-bold">Lead Scoring</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered lead quality prediction and scoring
          </p>
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

      {/* Scoring Configuration Panel */}
      {showConfig && (
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
        <Card>
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
    </div>
  );
};

export default LeadScoring;
