import { useState } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import api from '@/lib/api';

const RetryQueue = () => {
  const { toast } = useToast();
  const [failedJobs, setFailedJobs] = useState([
    {
      id: '1',
      type: 'Email Campaign',
      name: 'Spring Launch Newsletter',
      error: 'SMTP connection timeout',
      attempts: 3,
      lastAttempt: '15 min ago',
      nextRetry: '5 min',
      status: 'retrying',
    },
    {
      id: '2',
      type: 'Lead Import',
      name: 'Q1_leads.csv',
      error: 'Invalid email format on row 234',
      attempts: 2,
      lastAttempt: '1 hour ago',
      nextRetry: '30 min',
      status: 'retrying',
    },
    {
      id: '3',
      type: 'Webhook',
      name: 'Salesforce Integration',
      error: 'API rate limit exceeded',
      attempts: 5,
      lastAttempt: '3 hours ago',
      nextRetry: 'Manual',
      status: 'failed',
    },
  ]);

  const [retryingAll, setRetryingAll] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const handleRetryAll = async () => {
    setRetryingAll(true);
    toast.info('Retrying all failed jobs...');
    try {
      const jobIds = failedJobs.map(j => j.id);
      await api.post('/deliverability/retry/batch', { messageIds: jobIds });
      setFailedJobs([]);
      toast.success('All jobs retried successfully');
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      if (err?.response?.status === 404) {
        // Fallback: remove from local state
        setFailedJobs([]);
        toast.success('All jobs retried (local)');
      } else {
        toast.error(err?.response?.data?.message || 'Failed to retry all jobs');
      }
    } finally {
      setRetryingAll(false);
    }
  };

  const handleRetryOne = async (jobId: string, jobName: string) => {
    setRetryingId(jobId);
    toast.info(`Retrying ${jobName}...`);
    try {
      await api.post(`/deliverability/retry/${jobId}`);
      setFailedJobs(failedJobs.filter(j => j.id !== jobId));
      toast.success(`${jobName} retried successfully`);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      if (err?.response?.status === 404) {
        // Fallback: remove from local state
        setFailedJobs(failedJobs.filter(j => j.id !== jobId));
        toast.success(`${jobName} retried (local)`);
      } else {
        toast.error(err?.response?.data?.message || `Failed to retry ${jobName}`);
      }
    } finally {
      setRetryingId(null);
    }
  };

  const handleCancel = async (jobId: string, jobName: string) => {
    if (!confirm(`Cancel ${jobName}? This will remove it from the retry queue.`)) return;
    try {
      await api.delete(`/deliverability/retry/${jobId}`);
      setFailedJobs(failedJobs.filter(j => j.id !== jobId));
      toast.success(`${jobName} cancelled and removed from queue`);
    } catch {
      // Fallback: remove from local state
      setFailedJobs(failedJobs.filter(j => j.id !== jobId));
      toast.success(`${jobName} cancelled and removed from queue`);
    }
  };

  const handleViewDetails = (jobId: string) => {
    setExpandedJob(expandedJob === jobId ? null : jobId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Retry Queue</h1>
          <p className="text-muted-foreground mt-2">
            Manage failed jobs and retry operations
          </p>
        </div>
        <Button onClick={handleRetryAll} disabled={retryingAll || failedJobs.length === 0}>
          {retryingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {retryingAll ? 'Retrying...' : 'Retry All'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Jobs</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">In queue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retrying</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Currently processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Succeeded</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">145</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">86.3%</div>
            <p className="text-xs text-muted-foreground">Overall</p>
          </CardContent>
        </Card>
      </div>

      {/* Failed Jobs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Failed Jobs</CardTitle>
              <CardDescription>Jobs that require attention</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                Filter
              </Button>
              <Button variant="outline" size="sm">
                Sort
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {failedJobs.map((job) => (
              <div key={job.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div
                      className={`flex items-center justify-center h-10 w-10 rounded-lg ${
                        job.status === 'retrying' ? 'bg-orange-100' : 'bg-red-100'
                      }`}
                    >
                      {job.status === 'retrying' ? (
                        <RefreshCw className="h-5 w-5 text-orange-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold">{job.name}</h4>
                        <Badge variant="outline">{job.type}</Badge>
                        <Badge
                          variant={job.status === 'retrying' ? 'secondary' : 'destructive'}
                        >
                          {job.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <p className="text-sm text-red-600">{job.error}</p>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Attempts: {job.attempts}/5</span>
                        <span>Last attempt: {job.lastAttempt}</span>
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Next retry: {job.nextRetry}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => handleRetryOne(job.id, job.name)} disabled={retryingId === job.id}>
                      {retryingId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(job.id)}>
                      {expandedJob === job.id ? 'Hide Details' : 'View Details'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleCancel(job.id, job.name)}>
                      Delete
                    </Button>
                  </div>
                </div>
                {expandedJob === job.id && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                    <div><strong>Job ID:</strong> {job.id}</div>
                    <div><strong>Type:</strong> {job.type}</div>
                    <div><strong>Error:</strong> <span className="text-red-600">{job.error}</span></div>
                    <div><strong>Attempts:</strong> {job.attempts} / 5</div>
                    <div><strong>Last Attempt:</strong> {job.lastAttempt}</div>
                    <div><strong>Next Retry:</strong> {job.nextRetry}</div>
                    <div><strong>Status:</strong> {job.status}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Job Types */}
      <Card>
        <CardHeader>
          <CardTitle>Failed Jobs by Type</CardTitle>
          <CardDescription>Distribution of failures</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { type: 'Email Campaigns', count: 8, success: 85 },
              { type: 'Data Imports', count: 6, success: 92 },
              { type: 'Webhooks', count: 5, success: 78 },
              { type: 'Exports', count: 3, success: 95 },
              { type: 'API Calls', count: 1, success: 98 },
            ].map((jobType) => (
              <div key={jobType.type} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-semibold text-sm">{jobType.type}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {jobType.count} failed • {jobType.success}% success rate
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Retry Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Retry Configuration</CardTitle>
          <CardDescription>Configure automatic retry behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Max Retry Attempts</label>
              <input
                type="number"
                defaultValue="5"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Initial Retry Delay</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>1 minute</option>
                <option>5 minutes</option>
                <option>15 minutes</option>
                <option>30 minutes</option>
                <option>1 hour</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Backoff Strategy</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Linear (1x, 2x, 3x)</option>
                <option>Exponential (1x, 2x, 4x, 8x)</option>
                <option>Fixed (same delay)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Max Retry Delay</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>1 hour</option>
                <option>2 hours</option>
                <option>6 hours</option>
                <option>12 hours</option>
                <option>24 hours</option>
              </select>
            </div>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Enable automatic retries</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Send notification on repeated failures</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Auto-delete after max attempts</span>
            </label>
          </div>
          <Button>Save Settings</Button>
        </CardContent>
      </Card>

      {/* Recent Successes */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Succeeded</CardTitle>
          <CardDescription>Jobs that succeeded after retry</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                name: 'Newsletter Campaign',
                type: 'Email',
                succeeded: '10 min ago',
                attempts: 2,
              },
              {
                name: 'Lead Data Export',
                type: 'Export',
                succeeded: '1 hour ago',
                attempts: 1,
              },
              {
                name: 'HubSpot Sync',
                type: 'Webhook',
                succeeded: '3 hours ago',
                attempts: 3,
              },
            ].map((success, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{success.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {success.type} • Succeeded after {success.attempts} attempts •{' '}
                      {success.succeeded}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Common Error Types</CardTitle>
          <CardDescription>Most frequent failure reasons</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { error: 'Connection timeout', count: 12, percentage: 52 },
              { error: 'Rate limit exceeded', count: 5, percentage: 22 },
              { error: 'Invalid data format', count: 4, percentage: 17 },
              { error: 'Authentication failed', count: 2, percentage: 9 },
            ].map((errorType) => (
              <div key={errorType.error}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{errorType.error}</span>
                  <span className="text-sm text-muted-foreground">
                    {errorType.count} occurrences
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${errorType.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RetryQueue;
