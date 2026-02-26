import { useState, useRef } from 'react';
import { Terminal, AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';

const DebugConsole = () => {
  const { toast } = useToast();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const sourceRef = useRef<HTMLSelectElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [logs, setLogs] = useState([
    {
      id: 1,
      timestamp: '2024-01-15 14:32:15',
      level: 'error',
      message: 'Failed to send email campaign #234 - SMTP connection timeout',
      source: 'EmailService',
    },
    {
      id: 2,
      timestamp: '2024-01-15 14:30:42',
      level: 'warning',
      message: 'API rate limit approaching (450/500 requests)',
      source: 'APIGateway',
    },
    {
      id: 3,
      timestamp: '2024-01-15 14:28:18',
      level: 'info',
      message: 'Lead scoring model updated successfully',
      source: 'AIService',
    },
    {
      id: 4,
      timestamp: '2024-01-15 14:25:03',
      level: 'success',
      message: 'Database backup completed - 2.4GB',
      source: 'BackupService',
    },
    {
      id: 5,
      timestamp: '2024-01-15 14:20:55',
      level: 'error',
      message: 'Webhook delivery failed for endpoint https://example.com/webhook',
      source: 'WebhookService',
    },
    {
      id: 6,
      timestamp: '2024-01-15 14:18:32',
      level: 'info',
      message: 'User john.doe@company.com logged in from 192.168.1.1',
      source: 'AuthService',
    },
  ]);

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to clear all logs? This cannot be undone.')) {
      setLogs([]);
      toast.success('All logs cleared successfully');
    }
  };

  const handleExportLogs = () => {
    toast.info('Exporting logs...');
    setTimeout(() => {
      const logText = logs.map(log => 
        `[${log.level.toUpperCase()}] ${log.timestamp} | ${log.source} | ${log.message}`
      ).join('\n');
      
      // Create downloadable file (simulated)
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-logs-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Logs exported successfully');
    }, 500);
  };

  const filteredLogs = logs.filter(log => {
    if (selectedFilter !== 'all' && log.level !== selectedFilter) return false;
    if (selectedSource !== 'all' && log.source !== selectedSource) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase()) && !log.source.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getLogBadgeVariant = (level: string) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Debug Console</h1>
          <p className="text-muted-foreground mt-2">
            System logs and debugging information
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleClearLogs}>Clear Logs</Button>
          <Button variant="outline" onClick={handleExportLogs}>Export Logs</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <Terminal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,456</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67</div>
            <p className="text-xs text-muted-foreground">Monitor closely</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,366</div>
            <p className="text-xs text-muted-foreground">Normal activity</p>
          </CardContent>
        </Card>
      </div>

      {/* Log Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <select 
              className="px-4 py-2 border rounded-md"
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
            </select>
            <select 
              className="px-4 py-2 border rounded-md"
              ref={sourceRef}
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
            >
              <option value="all">All Sources</option>
              <option value="EmailService">EmailService</option>
              <option value="APIGateway">APIGateway</option>
              <option value="AIService">AIService</option>
              <option value="BackupService">BackupService</option>
              <option value="WebhookService">WebhookService</option>
              <option value="AuthService">AuthService</option>
            </select>
            <input
              type="text"
              placeholder="Search logs..."
              className="flex-1 px-4 py-2 border rounded-md"
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  toast.success(`Filters applied — ${filteredLogs.length} logs shown`);
                }
              }}
            />
            <Button onClick={() => {
              setSelectedSource(sourceRef.current?.value || 'all');
              setSearchQuery(searchRef.current?.value || '');
              toast.success(`Filters applied — showing ${filteredLogs.length} matching logs`);
            }}>Apply Filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* Console Output */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>Real-time application logs and events</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Terminal className="h-4 w-4 mr-2" />
              Live Mode
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-sm">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent"
              >
                {getLogIcon(log.level)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs text-muted-foreground">{log.timestamp}</span>
                    <Badge variant={getLogBadgeVariant(log.level) as 'default' | 'destructive' | 'warning' | 'success'} className="text-xs">
                      {log.level.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {log.source}
                    </Badge>
                  </div>
                  <p className="text-sm break-words">{log.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-4">
            <Button variant="outline">Load More Logs</Button>
          </div>
        </CardContent>
      </Card>

      {/* Console Commands */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Commands</CardTitle>
          <CardDescription>Common debugging and maintenance commands</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Button variant="outline" className="justify-start">
              <Terminal className="h-4 w-4 mr-2" />
              Clear cache
            </Button>
            <Button variant="outline" className="justify-start">
              <Terminal className="h-4 w-4 mr-2" />
              Restart services
            </Button>
            <Button variant="outline" className="justify-start">
              <Terminal className="h-4 w-4 mr-2" />
              Run health check
            </Button>
            <Button variant="outline" className="justify-start">
              <Terminal className="h-4 w-4 mr-2" />
              Generate test data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugConsole;
