import { useState, useEffect } from 'react';
import { Brain, Activity, Settings, Play, Pause, AlertCircle, RefreshCw } from 'lucide-react';
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

  const trainingMetrics = [
    { epoch: 1, trainLoss: 0.89, valLoss: 0.92, accuracy: 72.3 },
    { epoch: 5, trainLoss: 0.54, valLoss: 0.58, accuracy: 84.2 },
    { epoch: 10, trainLoss: 0.32, valLoss: 0.38, accuracy: 89.7 },
    { epoch: 15, trainLoss: 0.21, valLoss: 0.29, accuracy: 92.1 },
    { epoch: 20, trainLoss: 0.15, valLoss: 0.24, accuracy: 94.2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Model Training</h1>
          <p className="text-muted-foreground mt-2">
            Train and optimize your AI models
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
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
                        <Button variant="ghost" size="sm">
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm">
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
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
            <CardDescription>Churn Prediction Model - Epoch 15/20</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">75%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Train Loss</p>
                  <p className="text-2xl font-bold">0.21</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Val Loss</p>
                  <p className="text-2xl font-bold">0.29</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                  <p className="text-2xl font-bold">92.1%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time Elapsed</p>
                  <p className="text-2xl font-bold">23m</p>
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button variant="destructive" size="sm" className="flex-1">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Training
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  View Logs
                </Button>
              </div>
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
            <div className="flex items-start space-x-3 p-3 border rounded-lg bg-yellow-50">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Model Needs Retraining</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  "Conversion Predictor" hasn't been trained in 2 months. Accuracy may have degraded.
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Retrain Now
                </Button>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 border rounded-lg bg-blue-50">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">More Training Data Available</h4>
                <p className="text-sm text-blue-700 mt-1">
                  +2,400 new data points collected since last training. Consider retraining for better accuracy.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelTraining;
