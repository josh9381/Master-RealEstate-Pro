import { Merge, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const LeadsMerge = () => {
  const duplicates = [
    {
      id: 1,
      lead1: {
        id: 1234,
        name: 'John Smith',
        email: 'john.smith@company.com',
        phone: '+1 (555) 123-4567',
        company: 'Acme Corp',
        score: 78,
      },
      lead2: {
        id: 1567,
        name: 'John Smith',
        email: 'j.smith@acmecorp.com',
        phone: '+1 (555) 123-4567',
        company: 'Acme Corporation',
        score: 65,
      },
      similarity: 95,
      reason: 'Same name and phone',
    },
    {
      id: 2,
      lead1: {
        id: 2345,
        name: 'Sarah Johnson',
        email: 'sarah.j@techstart.com',
        phone: '+1 (555) 234-5678',
        company: 'TechStart Inc',
        score: 82,
      },
      lead2: {
        id: 2789,
        name: 'S. Johnson',
        email: 'sarah.johnson@techstart.com',
        phone: '+1 (555) 234-5678',
        company: 'TechStart',
        score: 71,
      },
      similarity: 88,
      reason: 'Same email domain and phone',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Merge Duplicate Leads</h1>
        <p className="text-muted-foreground mt-2">
          Find and merge duplicate lead records
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Duplicates</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">Need review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Merged This Month</CardTitle>
            <Merge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67</div>
            <p className="text-xs text-muted-foreground">Database cleaned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Merged</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">By rules</p>
          </CardContent>
        </Card>
      </div>

      {/* Merge Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Duplicate Detection Settings</CardTitle>
          <CardDescription>Configure how duplicates are identified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Match by email address</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Match by phone number</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Match by full name</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Match by company name</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Similarity Threshold</label>
            <div className="flex items-center space-x-4">
              <input type="range" min="50" max="100" defaultValue="80" className="flex-1" />
              <span className="text-sm font-medium">80%</span>
            </div>
          </div>
          <Button>Run Duplicate Scan</Button>
        </CardContent>
      </Card>

      {/* Potential Duplicates */}
      {duplicates.map((duplicate) => (
        <Card key={duplicate.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>Potential Duplicate Match</span>
                  <Badge variant="warning">{duplicate.similarity}% similar</Badge>
                </CardTitle>
                <CardDescription>Reason: {duplicate.reason}</CardDescription>
              </div>
              <Button>
                <Merge className="h-4 w-4 mr-2" />
                Merge Leads
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Lead 1 */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Lead #{duplicate.lead1.id}</h4>
                  <Badge variant="default">Keep This</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    <span className="font-medium">{duplicate.lead1.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{' '}
                    <span className="font-medium">{duplicate.lead1.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{' '}
                    <span className="font-medium">{duplicate.lead1.phone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Company:</span>{' '}
                    <span className="font-medium">{duplicate.lead1.company}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lead Score:</span>{' '}
                    <span className="font-medium">{duplicate.lead1.score}/100</span>
                  </div>
                </div>
              </div>

              {/* Lead 2 */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Lead #{duplicate.lead2.id}</h4>
                  <Badge variant="secondary">Merge Into Primary</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    <span className="font-medium">{duplicate.lead2.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{' '}
                    <span className="font-medium">{duplicate.lead2.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{' '}
                    <span className="font-medium">{duplicate.lead2.phone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Company:</span>{' '}
                    <span className="font-medium">{duplicate.lead2.company}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lead Score:</span>{' '}
                    <span className="font-medium">{duplicate.lead2.score}/100</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex space-x-2">
                <Button variant="outline">Not Duplicates</Button>
                <Button variant="outline">Skip for Now</Button>
              </div>
              <Button>
                <Merge className="h-4 w-4 mr-2" />
                Merge These Leads
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Merge History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Merges</CardTitle>
          <CardDescription>Previously merged duplicate records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                merged: 'Mike Wilson + M. Wilson',
                date: '2024-01-15',
                by: 'John Doe',
              },
              {
                merged: 'Emily Brown + E. Brown',
                date: '2024-01-14',
                by: 'Sarah Johnson',
              },
              {
                merged: 'David Lee + D. Lee',
                date: '2024-01-13',
                by: 'Auto-merge',
              },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{item.merged}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.date} by {item.by}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsMerge;
