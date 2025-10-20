import { Database, Zap, Trash2, RefreshCw, FileText, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const DatabaseMaintenance = () => {
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
            <div className="text-2xl font-bold">4.2 GB</div>
            <p className="text-xs text-muted-foreground">50 GB available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">PostgreSQL</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4M</div>
            <p className="text-xs text-muted-foreground">Across all tables</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2h ago</div>
            <p className="text-xs text-muted-foreground">Automatic backup</p>
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
            <Button className="h-auto py-4 flex-col">
              <Zap className="h-6 w-6 mb-2" />
              <span className="font-semibold">Optimize Database</span>
              <span className="text-xs text-muted-foreground mt-1">
                Run vacuum and analyze
              </span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col">
              <RefreshCw className="h-6 w-6 mb-2" />
              <span className="font-semibold">Reindex Tables</span>
              <span className="text-xs text-muted-foreground mt-1">
                Rebuild all indexes
              </span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col">
              <Database className="h-6 w-6 mb-2" />
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
          <CardDescription>Size and record count by table</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'leads', records: 125340, size: '1.2 GB', lastVacuum: '2 days ago' },
              { name: 'contacts', records: 89012, size: '890 MB', lastVacuum: '3 days ago' },
              { name: 'campaigns', records: 2340, size: '120 MB', lastVacuum: '1 day ago' },
              { name: 'activities', records: 567890, size: '780 MB', lastVacuum: '5 days ago' },
              { name: 'users', records: 156, size: '12 MB', lastVacuum: '1 week ago' },
            ].map((table) => (
              <div key={table.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-semibold font-mono">{table.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {table.records.toLocaleString()} records • {table.size} • Last vacuum: {table.lastVacuum}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    Optimize
                  </Button>
                  <Button variant="outline" size="sm">
                    Details
                  </Button>
                </div>
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
              <Button variant="outline">Run Vacuum</Button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>VACUUM FULL (locks table)</span>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
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
              <Button variant="outline">Reindex All</Button>
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
              <Button variant="outline">Cluster Tables</Button>
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
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Daily at 2:00 AM</option>
                <option>Every 12 hours</option>
                <option>Every 6 hours</option>
                <option>Hourly</option>
                <option>Manual only</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Retention Period</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>7 days</option>
                <option>14 days</option>
                <option>30 days</option>
                <option>90 days</option>
                <option>Forever</option>
              </select>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button>Create Backup Now</Button>
            <Button variant="outline">View Backup History</Button>
          </div>
        </CardContent>
      </Card>

      {/* Query Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Slow Query Log</CardTitle>
          <CardDescription>Queries that need optimization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { query: 'SELECT * FROM leads WHERE...', duration: '2.3s', calls: 1234 },
              { query: 'SELECT COUNT(*) FROM activities...', duration: '1.8s', calls: 567 },
              { query: 'UPDATE campaigns SET...', duration: '890ms', calls: 89 },
            ].map((slowQuery, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <code className="text-sm flex-1">{slowQuery.query}</code>
                  <Badge variant="destructive">{slowQuery.duration}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Called {slowQuery.calls.toLocaleString()} times in last 24h
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Connection Pool */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Pool</CardTitle>
          <CardDescription>Database connection statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Active Connections</span>
              <span className="text-sm">12 / 100</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Idle Connections</span>
              <span className="text-sm">8</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Max Connections</span>
              <span className="text-sm">100</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Avg. Query Time</span>
              <span className="text-sm">45ms</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Dangerous operations - use with caution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-semibold">Truncate All Tables</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Delete all data from all tables (structure remains)
              </p>
            </div>
            <Button variant="destructive">Truncate All</Button>
          </div>
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-semibold">Drop Database</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Permanently delete the entire database
              </p>
            </div>
            <Button variant="destructive">Drop Database</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseMaintenance;
