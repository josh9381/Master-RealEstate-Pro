import { useState, useEffect } from 'react';
import { Brain, Activity, Settings, Play, Pause, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { aiApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
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
  const [loading, setLoading] = useState(true)
  const [models, setModels] = useState<Array<{
    id: string | number;
    name: string;
    type: string;
    status: string;
    accuracy: number;
    lastTrained: string;
    trainingTime?: string;
    dataPoints?: number;
  }>>([])

  useEffect(() => {
    const fetchData = async () => {
      await loadTrainingModels()
    }
    fetchData()
  }, [])

  const loadTrainingModels = async () => {
    setLoading(true)
    try {
      const data = await aiApi.getTrainingModels()
      if (data?.models) {
        setModels(data.models)
      }
    } catch (error) {
      const err = error as Error
      toast.error(err.message || 'Failed to load training models')
    } finally {
      setLoading(false)
    }
  }

  // Training metrics will be populated from real training runs
  const trainingMetrics: Array<{ epoch: number; trainLoss: number; valLoss: number; accuracy: number }> = [];

  return (
    <div className="space-y-6">
      {/* Coming Soon Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-amber-800">Coming Soon — Custom Model Training</h3>
          <p className="text-sm text-amber-700 mt-1">
            Custom model training requires dedicated ML infrastructure which is not yet available.
            AI features like Lead Scoring and Content Generation use pre-trained models and work today.
          </p>
        </div>
        <Badge variant="warning" className="shrink-0">Coming Soon</Badge>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Model Training</h1>
          <p className="text-muted-foreground mt-2">
            Train and optimize your AI models
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" disabled title="Training configuration coming soon">
            <Settings className="h-4 w-4 mr-2" />
            Training Config
          </Button>
          <Button onClick={loadTrainingModels} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
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
                        <Button variant="ghost" size="sm" disabled title="Pause training coming soon">
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" disabled title="Start training coming soon">
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" disabled title="Model details coming soon">
                        View
                      </Button>
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
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No training jobs running. Start a training job from the models table above.
            </div>
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
