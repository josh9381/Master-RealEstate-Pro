import { Database, Download, Upload, RefreshCw, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const BackupRestore = () => {
  const backupHistory = [
    {
      id: 1,
      name: 'Full System Backup',
      size: '2.4 GB',
      date: '2024-01-15 03:00 AM',
      type: 'automatic',
      status: 'completed',
    },
    {
      id: 2,
      name: 'Manual Backup - Pre-Update',
      size: '2.3 GB',
      date: '2024-01-14 10:30 AM',
      type: 'manual',
      status: 'completed',
    },
    {
      id: 3,
      name: 'Full System Backup',
      size: '2.3 GB',
      date: '2024-01-14 03:00 AM',
      type: 'automatic',
      status: 'completed',
    },
    {
      id: 4,
      name: 'Full System Backup',
      size: '2.2 GB',
      date: '2024-01-13 03:00 AM',
      type: 'automatic',
      status: 'completed',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Backup & Restore</h1>
        <p className="text-muted-foreground mt-2">
          Manage system backups and restore data
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Create Backup</CardTitle>
            </div>
            <CardDescription>Generate a new system backup</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Database className="h-4 w-4 mr-2" />
              Backup Now
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Upload className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Restore Backup</CardTitle>
            </div>
            <CardDescription>Restore from previous backup</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Restore
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Download className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Download Backup</CardTitle>
            </div>
            <CardDescription>Download backup to local storage</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Automatic Backup Settings</CardTitle>
          <CardDescription>Configure automated backup schedule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium mb-1">Enable Automatic Backups</h4>
              <p className="text-sm text-muted-foreground">
                Automatically backup system data daily at 3:00 AM
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Backup Frequency</label>
              <select className="w-full p-2 border rounded-md">
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Backup Time</label>
              <input type="time" defaultValue="03:00" className="w-full p-2 border rounded-md" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Retention Period</label>
            <select className="w-full p-2 border rounded-md">
              <option>Keep last 7 backups</option>
              <option>Keep last 14 backups</option>
              <option>Keep last 30 backups</option>
              <option>Keep all backups</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-600" />
            <p className="text-sm">
              <strong>Next backup:</strong> Tomorrow at 3:00 AM (in 8 hours)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>View and manage your backup files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backupHistory.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{backup.name}</h4>
                      <Badge
                        variant={backup.type === 'automatic' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {backup.type}
                      </Badge>
                      <Badge variant="success" className="text-xs">
                        {backup.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>{backup.size}</span>
                      <span>{backup.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Storage Info */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Storage</CardTitle>
          <CardDescription>Current backup storage usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Storage Used</span>
                <span className="font-medium">9.2 GB / 50 GB</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '18.4%' }}></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Total Backups</p>
                <p className="text-2xl font-bold">4</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Backup</p>
                <p className="text-2xl font-bold">2h ago</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Space</p>
                <p className="text-2xl font-bold">40.8 GB</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupRestore;
