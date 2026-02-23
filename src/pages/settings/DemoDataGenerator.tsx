import { Database, Trash2, Download, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useState } from 'react';
import { useToast } from '@/hooks/useToast';

const DemoDataGenerator = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [_generating, setGenerating] = useState(false);
  const [leadsCount, setLeadsCount] = useState('100');
  const [campaignsCount, setCampaignsCount] = useState('10');
  const [activitiesCount, setActivitiesCount] = useState('500');

  const handleGenerate = async (type: string, count: string) => {
    setGenerating(true);
    try {
      // Would use dedicated demo data API endpoint in production
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Data Generated', `Successfully generated ${count} sample ${type}.`);
    } catch (error) {
      toast.error('Generation Failed', `Failed to generate ${type}.`);
    } finally {
      setGenerating(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL demo data? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Data Cleared', 'All demo data has been deleted successfully.');
    } catch (error) {
      toast.error('Error', 'Failed to clear demo data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Demo Data Generator</h1>
          <p className="text-muted-foreground mt-2">
            Generate sample data for testing and demonstrations
          </p>
        </div>
      </div>

      {/* Warning Banner */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-orange-900">Demo Data Warning</h4>
              <p className="text-sm text-orange-800 mt-1">
                Demo data is for testing purposes only. Make sure to clear demo data before going
                live. Generated data will be clearly marked to prevent confusion with real data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demo Leads</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">234</div>
            <p className="text-xs text-muted-foreground">Sample records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demo Campaigns</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Sample campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demo Activities</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,567</div>
            <p className="text-xs text-muted-foreground">Sample activities</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Generated</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3d ago</div>
            <p className="text-xs text-muted-foreground">January 12, 2024</p>
          </CardContent>
        </Card>
      </div>

      {/* Generate Data */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Demo Data</CardTitle>
          <CardDescription>Create sample data for different modules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Leads */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Leads & Contacts</h4>
                <p className="text-sm text-muted-foreground">Generate sample lead records</p>
              </div>
              <Badge variant="secondary">234 existing</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Number of Leads</label>
                <input
                  type="number"
                  placeholder="100"
                  value={leadsCount}
                  onChange={(e) => setLeadsCount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Status Distribution</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>Random</option>
                  <option>Mostly New</option>
                  <option>Mostly Qualified</option>
                  <option>Mixed</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>Last 6 months</option>
                  <option>Last year</option>
                </select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">Include email addresses</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">Include phone numbers</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Include company info</span>
              </label>
            </div>
            <Button onClick={() => handleGenerate('leads', leadsCount)} loading={loading}>
              Generate Leads
            </Button>
          </div>

          <div className="border-t pt-6">
            {/* Campaigns */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Email Campaigns</h4>
                  <p className="text-sm text-muted-foreground">Generate sample campaigns</p>
                </div>
                <Badge variant="secondary">12 existing</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Number of Campaigns</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={campaignsCount}
                    onChange={(e) => setCampaignsCount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Campaign Type</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option>All Types</option>
                    <option>Email Only</option>
                    <option>SMS Only</option>
                    <option>Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Performance</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option>Realistic</option>
                    <option>High Performance</option>
                    <option>Low Performance</option>
                    <option>Varied</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Include open/click data</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Include conversions</span>
                </label>
              </div>
              <Button onClick={() => handleGenerate('campaigns', campaignsCount)} loading={loading}>
                Generate Campaigns
              </Button>
            </div>
          </div>

          <div className="border-t pt-6">
            {/* Activities */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Activities & Tasks</h4>
                  <p className="text-sm text-muted-foreground">Generate sample activities</p>
                </div>
                <Badge variant="secondary">1,567 existing</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Number of Activities</label>
                  <input
                    type="number"
                    placeholder="500"
                    value={activitiesCount}
                    onChange={(e) => setActivitiesCount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Activity Types</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option>All Types</option>
                    <option>Calls Only</option>
                    <option>Emails Only</option>
                    <option>Notes Only</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Assignment</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option>Random Users</option>
                    <option>Current User</option>
                    <option>Unassigned</option>
                  </select>
                </div>
              </div>
              <Button onClick={() => handleGenerate('activities', activitiesCount)} loading={loading}>
                Generate Activities
              </Button>
            </div>
          </div>

          <div className="border-t pt-6">
            {/* Analytics Data */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Analytics Data</h4>
                  <p className="text-sm text-muted-foreground">Generate sample metrics</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Time Period</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option>Last 30 days</option>
                    <option>Last 90 days</option>
                    <option>Last 6 months</option>
                    <option>Last year</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Data Points</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Trend</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option>Growth</option>
                    <option>Decline</option>
                    <option>Stable</option>
                    <option>Volatile</option>
                  </select>
                </div>
              </div>
              <Button>Generate Analytics</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common demo data operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-auto py-4 flex-col">
              <Database className="h-6 w-6 mb-2" />
              <span className="font-semibold">Full Demo Dataset</span>
              <span className="text-xs text-muted-foreground mt-1">
                Generate complete sample data
              </span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col">
              <Download className="h-6 w-6 mb-2" />
              <span className="font-semibold">Import Sample Data</span>
              <span className="text-xs text-muted-foreground mt-1">
                Load from template file
              </span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col text-red-600 hover:text-red-700" onClick={handleClearAll} loading={loading}>
              <Trash2 className="h-6 w-6 mb-2" />
              <span className="font-semibold">Clear All Demo Data</span>
              <span className="text-xs text-muted-foreground mt-1">
                Remove all sample records
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Data Templates</CardTitle>
          <CardDescription>Pre-configured demo scenarios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                name: 'Small Business',
                description: '50 leads, 5 campaigns, 200 activities',
                size: 'Small',
              },
              {
                name: 'Growing Startup',
                description: '200 leads, 15 campaigns, 800 activities',
                size: 'Medium',
              },
              {
                name: 'Enterprise Sales',
                description: '1000 leads, 50 campaigns, 5000 activities',
                size: 'Large',
              },
              {
                name: 'Marketing Agency',
                description: '500 leads, 30 campaigns, 2000 activities',
                size: 'Medium',
              },
            ].map((template) => (
              <div
                key={template.name}
                className="p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{template.name}</h4>
                  <Badge variant="outline">{template.size}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                <Button variant="outline" size="sm">
                  Use Template
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible demo data operations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-semibold">Clear All Demo Data</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Permanently delete all demo leads, campaigns, and activities
              </p>
            </div>
            <Button variant="destructive">Clear Demo Data</Button>
          </div>
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-semibold">Reset to Factory Defaults</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Remove all data and reset system to initial state
              </p>
            </div>
            <Button variant="destructive">Reset System</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoDataGenerator;
