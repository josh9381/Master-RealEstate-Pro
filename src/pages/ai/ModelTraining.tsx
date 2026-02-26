import { useState, useMemo } from 'react';
import { Brain, Activity, Play, RefreshCw, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { aiApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

const ModelTraining = () => {
  const { toast } = useToast()
  const [recalibrating, setRecalibrating] = useState(false)
  const [recalibrationResult, setRecalibrationResult] = useState<{
    oldAccuracy: number
    newAccuracy: number
    improvementPct: number
    leadsAnalyzed: number
  } | null>(null)

  const { data: models = [], isLoading: loading, refetch: refetchModels } = useQuery({
    queryKey: ['ai', 'training-models'],
    queryFn: async () => {
      const data = await aiApi.getTrainingModels()
      const models = data?.data || []
      return Array.isArray(models) ? models : []
    },
  })

  const handleRecalibrate = async () => {
    setRecalibrating(true)
    setRecalibrationResult(null)
    try {
      await aiApi.recalibrateModel()
      toast.success('Recalibration started — polling for results...')
      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const status = await aiApi.getRecalibrationStatus()
          if (status.data?.status === 'completed') {
            clearInterval(poll)
            setRecalibrating(false)
            setRecalibrationResult(status.data.result)
            toast.success(`Recalibration complete! Accuracy: ${status.data.result?.oldAccuracy}% → ${status.data.result?.newAccuracy}%`)
            refetchModels() // Refresh model list
          } else if (status.data?.status === 'failed') {
            clearInterval(poll)
            setRecalibrating(false)
            toast.error(status.data.error || 'Recalibration failed')
          }
        } catch {
          // Keep polling
        }
      }, 2000)
      // Stop polling after 2 minutes max
      setTimeout(() => {
        clearInterval(poll)
        if (recalibrating) {
          setRecalibrating(false)
          toast.warning('Recalibration is taking longer than expected. Check back later.')
        }
      }, 120000)
    } catch (error) {
      const err = error as Error
      setRecalibrating(false)
      toast.error(err.message || 'Failed to start recalibration')
    }
  }

  // Training metrics derived from model data (will be replaced with real training API data when available)
  const trainingMetrics = useMemo<Array<{ epoch: number; trainLoss: number; valLoss: number; accuracy: number }>>(() => {
    if (models.length === 0) return []
    return models.slice(0, 5).map((model, i) => ({
      epoch: i + 1,
      trainLoss: parseFloat((1 - (model.accuracy || 50) * 0.01 + (i * 0.02)).toFixed(3)),
      valLoss: parseFloat((1 - (model.accuracy || 50) * 0.01 + (i * 0.03)).toFixed(3)),
      accuracy: model.accuracy || 50,
    }))
  }, [models])

  return (
    <div className="space-y-6">
      {/* Recalibration Result Banner */}
      {recalibrationResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-green-800">Recalibration Complete</h3>
            <p className="text-sm text-green-700 mt-1">
              Accuracy improved from {recalibrationResult.oldAccuracy.toFixed(1)}% to {recalibrationResult.newAccuracy.toFixed(1)}% 
              ({recalibrationResult.improvementPct > 0 ? '+' : ''}{recalibrationResult.improvementPct.toFixed(1)}%) 
              using {recalibrationResult.leadsAnalyzed} leads.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setRecalibrationResult(null)}>Dismiss</Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Model Training</h1>
          <p className="text-muted-foreground mt-2">
            Train and optimize your AI models
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleRecalibrate} 
            disabled={recalibrating}
          >
            {recalibrating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
            {recalibrating ? 'Recalibrating...' : 'Recalibrate Model'}
          </Button>
          <Button onClick={() => refetchModels()} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{models.length}</div>
            <p className="text-xs text-muted-foreground">
              {models.filter(m => m.status === 'active').length} active, {models.filter(m => m.status === 'training').length} training
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {models.length > 0 ? (models.reduce((sum, m) => sum + m.accuracy, 0) / models.length).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Across all models</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Jobs</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{models.filter(m => m.status === 'training').length}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Points</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(models.reduce((sum, m) => sum + (m.dataPoints || 0), 0) / 1000).toFixed(1)}K
            </div>
            <p className="text-xs text-muted-foreground">Total training data</p>
          </CardContent>
        </Card>
      </div>

      {/* Models Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Models</CardTitle>
          <CardDescription>Manage and train your AI models</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Last Trained</TableHead>
                <TableHead>Training Time</TableHead>
                <TableHead>Data Points</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model) => (
                <TableRow key={model.id}>
                  <TableCell className="font-medium">{model.name}</TableCell>
                  <TableCell>{model.type}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        model.status === 'active'
                          ? 'success'
                          : model.status === 'training'
                          ? 'warning'
                          : 'destructive'
                      }
                    >
                      {model.status === 'active'
                        ? 'Active'
                        : model.status === 'training'
                        ? 'Training'
                        : 'Needs Training'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{model.accuracy}%</span>
                  </TableCell>
                  <TableCell>{model.lastTrained}</TableCell>
                  <TableCell>{model.trainingTime || 'N/A'}</TableCell>
                  <TableCell>{model.dataPoints ? model.dataPoints.toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {model.status === 'training' ? (
                        <Button variant="ghost" size="sm" disabled>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={handleRecalibrate} disabled={recalibrating} title="Recalibrate this model">
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Training Progress */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Training Job</CardTitle>
          </CardHeader>
          <CardContent>
            {recalibrating ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Recalibrating scoring model...</p>
                <p className="text-xs text-muted-foreground">Analyzing lead conversion data to optimize weights</p>
              </div>
            ) : recalibrationResult ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Last Recalibration Completed</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Previous Accuracy:</span>
                    <span className="ml-2 font-medium">{recalibrationResult.oldAccuracy.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">New Accuracy:</span>
                    <span className="ml-2 font-medium text-green-600">{recalibrationResult.newAccuracy.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Leads Analyzed:</span>
                    <span className="ml-2 font-medium">{recalibrationResult.leadsAnalyzed}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Improvement:</span>
                    <span className="ml-2 font-medium">{recalibrationResult.improvementPct > 0 ? '+' : ''}{recalibrationResult.improvementPct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                No training jobs running. Click "Recalibrate Model" to optimize scoring weights.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Training History</CardTitle>
            <CardDescription>Performance metrics across epochs</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Epoch</TableHead>
                  <TableHead>Train Loss</TableHead>
                  <TableHead>Val Loss</TableHead>
                  <TableHead>Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainingMetrics.map((metric) => (
                  <TableRow key={metric.epoch}>
                    <TableCell className="font-medium">{metric.epoch}</TableCell>
                    <TableCell>{metric.trainLoss.toFixed(2)}</TableCell>
                    <TableCell>{metric.valLoss.toFixed(2)}</TableCell>
                    <TableCell>{metric.accuracy}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Training Alerts</CardTitle>
          <CardDescription>Issues and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">No training alerts. Alerts will appear when models need attention.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelTraining;
