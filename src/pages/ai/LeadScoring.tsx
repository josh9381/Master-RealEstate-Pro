import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Target, TrendingUp, AlertCircle, Settings, RefreshCw } from 'lucide-react';
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
        
        const highQualityCount = scoredLeads.filter((l: any) => l.score >= 80).length
        let scoringStats = {
          accuracy: 0,
          leadsScored: totalLeads,
          highQuality: highQualityCount,
        }
        
        let modelStatus = 'active'
        try {
          const perfData = await aiApi.getModelPerformance()
          if (perfData?.accuracy) {
            scoringStats = { ...scoringStats, accuracy: Math.floor(perfData.accuracy * 100) }
          }
          if (perfData?.status) {
            modelStatus = perfData.status
          }
        } catch {
          // Model performance not available
        }
        
        let scoreFactors = defaultScoreFactors
        try {
          const featureData = await aiApi.getFeatureImportance()
          if (featureData?.features) {
            scoreFactors = featureData.features.map((f: { name: string; importance: number }) => ({
              factor: f.name,
              weight: Math.round(f.importance * 100),
              impact: f.importance > 0.20 ? 'High' : f.importance > 0.10 ? 'Medium' : 'Low'
            }))
          }
        } catch {
          // Keep default factors if API fails
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
          <Button variant="outline" disabled title="Model configuration coming soon">
            <Settings className="h-4 w-4 mr-2" />
            Configure Model
          </Button>
          <Button onClick={handleRecalculateScores} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
            Recalculate Scores
          </Button>
        </div>
      </div>

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
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/leads/${lead.id}`)}>
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

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
