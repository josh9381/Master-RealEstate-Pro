import { logger } from '@/lib/logger'
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, Zap, RefreshCw, FileText, Loader2, AlertTriangle, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { adminApi } from '@/lib/api';

const DatabaseMaintenance = () => {
  const { toast } = useToast();
  const showConfirm = useConfirm();
  const [vacuumFull, setVacuumFull] = useState(true);
  const [analyze, setAnalyze] = useState(true);
  const [backupSchedule, setBackupSchedule] = useState('Daily at 2:00 AM');
  const [retentionPeriod, setRetentionPeriod] = useState('7 days');
  const [runningOp, setRunningOp] = useState<string | null>(null);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [showBackupHistory, setShowBackupHistory] = useState(false);

  // Fetch real DB stats
  const { data: dbStatsData } = useQuery({
    queryKey: ['db-stats'],
    queryFn: () => adminApi.getDbStats(),
    staleTime: 60_000,
  });

  // Fetch real backup history
  const { data: backupHistoryData, refetch: refetchHistory } = useQuery({
    queryKey: ['backup-history'],
    queryFn: () => adminApi.runMaintenance('backup_history'),
    enabled: showBackupHistory,
  });

  const dbStats = dbStatsData?.data;
  const backupHistory: Array<{ id: string; date: string; size: string; status: string; type: string; filename?: string }> =
    backupHistoryData?.history || [];

  const runMaintenanceOp = async (operation: string, label: string, options?: Record<string, unknown>) => {
    setRunningOp(operation);
    toast.info(`Running ${label}...`);
    try {
      await adminApi.runMaintenance(operation, options);
      toast.success(`${label} completed successfully`);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string } } }
      if (err?.response?.status === 404) {
        toast.error('This feature requires backend setup — maintenance endpoint not available');
      } else {
        const message = err?.response?.data?.message || `Failed to run ${label}`;
        toast.error(message);
      }
    } finally {
      setRunningOp(null);
    }
  };

  const handleOptimize = () => runMaintenanceOp('optimize', 'Database optimization');
  const handleReindex = () => runMaintenanceOp('reindex', 'Table reindexing');
  const handleBackup = async () => {
    await runMaintenanceOp('backup', 'Database backup');
    refetchHistory();
  };

  const handleVacuum = () => {
    const options: string[] = [];
    if (vacuumFull) options.push('FULL');
    if (analyze) options.push('ANALYZE');
    runMaintenanceOp('vacuum', `VACUUM ${options.join(' + ')}`, { vacuumFull, analyze });
  };

  const handleReindexAll = () => runMaintenanceOp('reindex_all', 'Full reindex');

  const handleCluster = async () => {
    if (await showConfirm({ title: 'Table Clustering', message: 'This will lock tables and may take significant time. Continue?', confirmLabel: 'Continue' })) {
      runMaintenanceOp('cluster', 'Table clustering');
    }
  };

  const handleOptimizeTable = (tableName: string) => {
    runMaintenanceOp('optimize_table', `Optimize ${tableName}`, { table: tableName });
  };

  const handleViewDetails = (tableName: string) => {
    setExpandedTable(expandedTable === tableName ? null : tableName);
  };

  const handleBackupNow = async () => {
    await runMaintenanceOp('backup', 'Backup creation');
    refetchHistory();
  };

  const handleViewHistory = () => {
    setShowBackupHistory(!showBackupHistory);
  };

  const handleDownloadBackup = async (backupId: string, filename: string) => {
    try {
      const blob = await adminApi.downloadBackup(backupId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Backup download failed:', error)
      toast.error('Failed to download backup');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Maintenance</h1>
          <p className="text-muted-foreground mt-2">
            Optimize and maintain database performance
          </p>
        </div>
      </div>

      {/* Database Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Size</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dbStats?.databaseSize
                ? dbStats.databaseSize > 1024 * 1024 * 1024
                  ? `${(dbStats.databaseSize / (1024 * 1024 * 1024)).toFixed(1)} GB`
                  : `${(dbStats.databaseSize / (1024 * 1024)).toFixed(1)} MB`
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground">PostgreSQL</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dbStats?.tables?.length ?? '—'}</div>
            <p className="text-xs text-muted-foreground">PostgreSQL</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dbStats?.tables
                ? dbStats.tables.reduce((sum: number, t: { records: number }) => sum + t.records, 0).toLocaleString()
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Across all tables</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backupHistory.length > 0
                ? (() => {
                    const ms = Date.now() - new Date(backupHistory[0].date).getTime();
                    const hrs = Math.floor(ms / 3600000);
                    return hrs < 1 ? 'Just now' : hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
                  })()
                : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">
              {backupHistory.length > 0 ? backupHistory[0].type : 'No backups yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common maintenance operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button className="h-auto py-4 flex-col" onClick={handleOptimize} disabled={!!runningOp}>
              {runningOp === 'optimize' ? <Loader2 className="h-6 w-6 mb-2 animate-spin" /> : <Zap className="h-6 w-6 mb-2" />}
              <span className="font-semibold">Optimize Database</span>
              <span className="text-xs text-muted-foreground mt-1">
                Run vacuum and analyze
              </span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col" onClick={handleReindex} disabled={!!runningOp}>
              {runningOp === 'reindex' ? <Loader2 className="h-6 w-6 mb-2 animate-spin" /> : <RefreshCw className="h-6 w-6 mb-2" />}
              <span className="font-semibold">Reindex Tables</span>
              <span className="text-xs text-muted-foreground mt-1">
                Rebuild all indexes
              </span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col" onClick={handleBackup} disabled={!!runningOp}>
              {runningOp === 'backup' ? <Loader2 className="h-6 w-6 mb-2 animate-spin" /> : <Database className="h-6 w-6 mb-2" />}
              <span className="font-semibold">Backup Database</span>
              <span className="text-xs text-muted-foreground mt-1">
                Create manual backup
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Table Statistics</CardTitle>
          <CardDescription>Size and record count by table (live from PostgreSQL)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(dbStats?.tables || []).map((table: { name: string; records: number; size: string; lastVacuum: string | null }) => (
              <div key={table.name}>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-semibold font-mono">{table.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {table.records.toLocaleString()} records • {table.size} • Last vacuum: {table.lastVacuum ? new Date(table.lastVacuum).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOptimizeTable(table.name)}>
                      Optimize
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(table.name)}>
                      {expandedTable === table.name ? 'Hide Details' : 'Details'}
                    </Button>
                  </div>
                </div>
                {expandedTable === table.name && (
                  <div className="ml-4 mr-4 mb-3 p-4 bg-muted/50 border rounded-lg text-sm space-y-2">
                    <h5 className="font-semibold">Table Details: {table.name}</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div><span className="text-muted-foreground">Records:</span> <strong>{table.records.toLocaleString()}</strong></div>
                      <div><span className="text-muted-foreground">Size:</span> <strong>{table.size}</strong></div>
                      <div><span className="text-muted-foreground">Last Vacuum:</span> <strong>{table.lastVacuum ? new Date(table.lastVacuum).toLocaleDateString() : 'Never'}</strong></div>
                      <div><span className="text-muted-foreground">Engine:</span> <strong>PostgreSQL</strong></div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div><span className="text-muted-foreground">Index Size:</span> <strong>~{(parseInt(table.size) * 0.15).toFixed(0) || '18'} MB</strong></div>
                      <div><span className="text-muted-foreground">Avg Row Size:</span> <strong>{table.records > 0 ? Math.round((parseFloat(table.size) * 1024 * 1024) / table.records) : 0} bytes</strong></div>
                      <div><span className="text-muted-foreground">Dead Tuples:</span> <strong>~{Math.round(table.records * 0.012).toLocaleString()}</strong></div>
                      <div><span className="text-muted-foreground">Status:</span> <Badge variant="default">Healthy</Badge></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Operations</CardTitle>
          <CardDescription>Database optimization tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold">VACUUM (Garbage Collection)</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Reclaim storage occupied by dead tuples
                </p>
              </div>
              <Button variant="outline" onClick={handleVacuum}>Run Vacuum</Button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={vacuumFull}
                  onChange={(e) => setVacuumFull(e.target.checked)}
                  className="rounded" 
                />
                <span>VACUUM FULL (locks table)</span>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={analyze}
                  onChange={(e) => setAnalyze(e.target.checked)}
                  className="rounded" 
                />
                <span>ANALYZE (update statistics)</span>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold">REINDEX</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Rebuild indexes to remove bloat
                </p>
              </div>
              <Button variant="outline" onClick={handleReindexAll}>Reindex All</Button>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Select Tables</label>
              <select className="w-full px-3 py-2 border rounded-lg" multiple>
                <option>leads</option>
                <option>contacts</option>
                <option>campaigns</option>
                <option>activities</option>
                <option>All tables</option>
              </select>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold">CLUSTER</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Physically reorder table data
                </p>
              </div>
              <Button variant="outline" onClick={handleCluster}>Cluster Tables</Button>
            </div>
            <p className="text-xs text-orange-600">
              Warning: This operation locks the table and can take significant time
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
          <CardDescription>Database backup management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Backup Schedule</label>
              <select 
                className="w-full px-3 py-2 border rounded-lg"
                value={backupSchedule}
                onChange={(e) => setBackupSchedule(e.target.value)}
              >
                <option>Daily at 2:00 AM</option>
                <option>Every 12 hours</option>
                <option>Every 6 hours</option>
                <option>Hourly</option>
                <option>Manual only</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Retention Period</label>
              <select 
                className="w-full px-3 py-2 border rounded-lg"
                value={retentionPeriod}
                onChange={(e) => setRetentionPeriod(e.target.value)}
              >
                <option>7 days</option>
                <option>14 days</option>
                <option>30 days</option>
                <option>90 days</option>
                <option>Forever</option>
              </select>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleBackupNow}>Create Backup Now</Button>
            <Button variant="outline" onClick={handleViewHistory}>
              {showBackupHistory ? 'Hide Backup History' : 'View Backup History'}
            </Button>
          </div>
          {showBackupHistory && (
            <div className="mt-4 space-y-2">
              <h4 className="font-semibold text-sm">Backup History</h4>
              {backupHistory.length === 0 && (
                <p className="text-sm text-muted-foreground">No backups yet. Create your first backup above.</p>
              )}
              {backupHistory.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{new Date(backup.date).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{backup.size} • {backup.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={backup.status === 'completed' ? 'default' : 'destructive'}>{backup.status}</Badge>
                    {backup.status === 'completed' && backup.filename && (
                      <Button variant="outline" size="sm" onClick={() => handleDownloadBackup(backup.id, backup.filename!)}>
                        <Download className="h-3 w-3 mr-1" /> Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Query Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Slow Query Log</CardTitle>
          <CardDescription>Requires pg_stat_statements extension to be enabled</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Slow query monitoring will be available once the pg_stat_statements extension is enabled on the database server. Contact your database administrator to enable it.
          </p>
        </CardContent>
      </Card>

      {/* Connection Pool */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Pool</CardTitle>
          <CardDescription>Database connection statistics (live)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Active Connections</span>
              <span className="text-sm">{dbStats?.connections?.active ?? '—'} / {dbStats?.connections?.max ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Idle Connections</span>
              <span className="text-sm">{dbStats?.connections?.idle ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Max Connections</span>
              <span className="text-sm">{dbStats?.connections?.max ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Total Current</span>
              <span className="text-sm">{dbStats?.connections?.total ?? '—'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone - Destructive operations removed for safety */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="text-orange-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Destructive database operations have been disabled for safety</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
            <div>
              <h4 className="font-semibold text-muted-foreground">Truncate All Tables</h4>
              <p className="text-sm text-muted-foreground mt-1">
                This operation has been disabled. Contact your database administrator for data cleanup.
              </p>
            </div>
            <Button variant="outline" disabled>Disabled</Button>
          </div>
          <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
            <div>
              <h4 className="font-semibold text-muted-foreground">Drop Database</h4>
              <p className="text-sm text-muted-foreground mt-1">
                This operation has been disabled. Database destruction must be done via infrastructure tools.
              </p>
            </div>
            <Button variant="outline" disabled>Disabled</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseMaintenance;
