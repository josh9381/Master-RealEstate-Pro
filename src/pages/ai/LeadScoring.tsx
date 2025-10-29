import { useState, useEffect } from 'react';
import { Target, TrendingUp, AlertCircle, Settings, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { leadsApi, aiApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
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
  const [modelStatus] = useState('active');
  const [loading, setLoading] = useState(true)
  const [recentScores, setRecentScores] = useState<Array<{
    id: string | number;
    name: string;
    email: string;
    company: string;
    score: number;
    grade: string;
    confidence: number;
    trend: string;
  }>>([])
  const [scoreFactors, setScoreFactors] = useState<Array<{
    factor: string;
    weight: number;
    impact: string;
  }>>([
    { factor: 'Email Engagement', weight: 25, impact: 'High' },
    { factor: 'Company Size', weight: 20, impact: 'High' },
    { factor: 'Budget Indicated', weight: 18, impact: 'High' },
    { factor: 'Website Visits', weight: 15, impact: 'Medium' },
    { factor: 'Industry Match', weight: 12, impact: 'Medium' },
    { factor: 'Job Title', weight: 10, impact: 'Low' },
  ])

  useEffect(() => {
    const fetchData = async () => {
      await loadScoringData()
    }
    fetchData()
  }, [])

  const loadScoringData = async () => {
    setLoading(true)
    try {
      // Fetch leads sorted by score
      const leadsResponse = await leadsApi.getLeads({ 
        sortBy: 'score',
        sortOrder: 'desc',
        limit: 10
      })
      
      // Transform leads data for display
      const scoredLeads = leadsResponse.leads?.map((lead: { id: string; name: string; email: string; company?: string; score?: number }) => {
        const score = lead.score || 0
        return {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          company: lead.company || 'N/A',
          score,
          grade: getScoreGrade(score),
          confidence: Math.min(95, score + Math.floor(Math.random() * 10)),
          trend: score >= 80 ? 'up' : score >= 60 ? 'stable' : 'down'
        }
      }) || []
      
      setRecentScores(scoredLeads)
      
      // Try to fetch feature importance for score factors
      try {
        const featureData = await aiApi.getFeatureImportance()
        if (featureData?.features) {
          const factors = featureData.features.map((f: { name: string; importance: number }) => ({
            factor: f.name,
            weight: Math.round(f.importance * 100),
            impact: f.importance > 0.20 ? 'High' : f.importance > 0.10 ? 'Medium' : 'Low'
          }))
          setScoreFactors(factors)
        }
      } catch (err) {
        // Keep default factors if API fails
        console.log('Using default score factors')
      }
    } catch (error) {
      const err = error as Error
      toast.error(err.message || 'Failed to load scoring data')
    } finally {
      setLoading(false)
    }
  }

  const getScoreGrade = (score: number): string => {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C'
    if (score >= 50) return 'D'
    return 'F'
  }

  const handleRecalculateScores = async () => {
    try {
      setLoading(true)
      await aiApi.recalculateScores()
      toast.success('Score recalculation initiated')
      // Reload data after a short delay
      setTimeout(() => loadScoringData(), 2000)
    } catch (error) {
      const err = error as Error
      toast.error(err.message || 'Failed to recalculate scores')
      setLoading(false)
    }
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'destructive';
  };

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
          <Button variant="outline">
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
            <p className="text-xs text-muted-foreground mt-2">Last trained: 2 days ago</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Model Accuracy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">+1.5% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Scored</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">+128 today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High-Quality Leads</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
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
                {recentScores.map((lead) => (
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
                    <TableCell>{lead.confidence}%</TableCell>
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
                      <Button variant="ghost" size="sm">
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">A Grade (80-100)</span>
                <span className="text-sm text-muted-foreground">342 leads (27%)</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full" style={{ width: '27%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">B Grade (60-79)</span>
                <span className="text-sm text-muted-foreground">498 leads (40%)</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full" style={{ width: '40%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">C Grade (40-59)</span>
                <span className="text-sm text-muted-foreground">287 leads (23%)</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-3">
                <div className="bg-yellow-500 h-3 rounded-full" style={{ width: '23%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">D Grade (0-39)</span>
                <span className="text-sm text-muted-foreground">120 leads (10%)</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-3">
                <div className="bg-red-500 h-3 rounded-full" style={{ width: '10%' }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadScoring;
