import { Download, FileSpreadsheet, FileJson, FileText, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const LeadsExport = () => {
  const exportHistory = [
    {
      id: 1,
      name: 'All Leads - January 2024',
      format: 'CSV',
      records: 2340,
      date: '2024-01-15',
      status: 'completed',
    },
    {
      id: 2,
      name: 'Qualified Leads - Q4 2023',
      format: 'Excel',
      records: 890,
      date: '2024-01-10',
      status: 'completed',
    },
    {
      id: 3,
      name: 'Lead Scoring Data',
      format: 'JSON',
      records: 5600,
      date: '2024-01-05',
      status: 'completed',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Export Leads</h1>
        <p className="text-muted-foreground mt-2">Download your lead data in various formats</p>
      </div>

      {/* Export Options */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileSpreadsheet className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Excel (XLSX)</CardTitle>
            </div>
            <CardDescription>
              Export with formatting, formulas, and multiple sheets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export as Excel
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>CSV</CardTitle>
            </div>
            <CardDescription>Simple comma-separated values for easy import</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export as CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileJson className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>JSON</CardTitle>
            </div>
            <CardDescription>Structured data for developers and integrations</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export as JSON
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Export Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Export Filters</CardTitle>
          <CardDescription>Customize what data to include in your export</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Lead Status</label>
              <select className="w-full p-2 border rounded-md">
                <option>All Statuses</option>
                <option>New</option>
                <option>Contacted</option>
                <option>Qualified</option>
                <option>Converted</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Assigned To</label>
              <select className="w-full p-2 border rounded-md">
                <option>All Team Members</option>
                <option>John Doe</option>
                <option>Sarah Johnson</option>
                <option>Mike Smith</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date From</label>
              <input type="date" className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date To</label>
              <input type="date" className="w-full p-2 border rounded-md" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Fields to Include</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                'Name',
                'Email',
                'Phone',
                'Company',
                'Status',
                'Source',
                'Score',
                'Tags',
                'Created Date',
                'Last Contact',
                'Notes',
                'Custom Fields',
              ].map((field) => (
                <label key={field} className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">{field}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>Your previous exports and downloads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {exportHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{item.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <span>{item.format}</span>
                      <span>{item.records} records</span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {item.date}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Export */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Export</CardTitle>
          <CardDescription>Export all leads with default settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <h4 className="font-semibold mb-1">Export All Leads</h4>
              <p className="text-sm text-muted-foreground">
                Download all 4,567 leads as CSV with all fields
              </p>
            </div>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Quick Export
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsExport;
