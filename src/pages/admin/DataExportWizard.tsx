import { Download, FileText, Database, Filter, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const DataExportWizard = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Export Wizard</h1>
          <p className="text-muted-foreground mt-2">
            Export your data in multiple formats
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24,567</div>
            <p className="text-xs text-muted-foreground">Available for export</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Exports</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Largest Export</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15,340</div>
            <p className="text-xs text-muted-foreground">Records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Export</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2d ago</div>
            <p className="text-xs text-muted-foreground">Lead data (CSV)</p>
          </CardContent>
        </Card>
      </div>

      {/* Step 1: Select Data Type */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Select Data Type</CardTitle>
          <CardDescription>Choose what data you want to export</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { name: 'Leads', count: 12450, icon: '👤' },
              { name: 'Contacts', count: 8900, icon: '📇' },
              { name: 'Campaigns', count: 234, icon: '📧' },
              { name: 'Activities', count: 5670, icon: '📋' },
              { name: 'Tasks', count: 890, icon: '✓' },
              { name: 'Analytics', count: 1234, icon: '📊' },
            ].map((dataType) => (
              <div
                key={dataType.name}
                className="p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-3xl">{dataType.icon}</div>
                  <Badge variant="outline">{dataType.count.toLocaleString()}</Badge>
                </div>
                <h4 className="font-semibold">{dataType.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {dataType.count.toLocaleString()} records
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Select Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Select Fields</CardTitle>
          <CardDescription>Choose which fields to include in export</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                Select All
              </Button>
              <Button variant="outline" size="sm">
                Deselect All
              </Button>
            </div>
            <span className="text-sm text-muted-foreground">12 fields selected</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              'ID',
              'Name',
              'Email',
              'Phone',
              'Company',
              'Status',
              'Source',
              'Score',
              'Created Date',
              'Updated Date',
              'Assigned To',
              'Tags',
              'Notes',
              'Custom Field 1',
              'Custom Field 2',
            ].map((field) => (
              <label key={field} className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" defaultChecked={field !== 'Custom Field 2'} className="rounded" />
                <span className="text-sm">{field}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Apply Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Step 3: Apply Filters (Optional)</CardTitle>
          <CardDescription>Filter the data before exporting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>All Time</option>
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>This Year</option>
                <option>Custom Range</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select className="w-full px-3 py-2 border rounded-lg" multiple>
                <option>New</option>
                <option>Contacted</option>
                <option>Qualified</option>
                <option>Converted</option>
                <option>Lost</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Assigned To</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>All Users</option>
                <option>John Doe</option>
                <option>Sarah Johnson</option>
                <option>Mike Wilson</option>
                <option>Unassigned</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Source</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>All Sources</option>
                <option>Website</option>
                <option>Referral</option>
                <option>Email Campaign</option>
                <option>Social Media</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Score Range</label>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                placeholder="Min"
                className="w-24 px-3 py-2 border rounded-lg"
              />
              <span>to</span>
              <input
                type="number"
                placeholder="Max"
                className="w-24 px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Add Custom Filter
          </Button>
        </CardContent>
      </Card>

      {/* Step 4: Export Format */}
      <Card>
        <CardHeader>
          <CardTitle>Step 4: Choose Export Format</CardTitle>
          <CardDescription>Select how you want your data exported</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                format: 'CSV',
                icon: '📄',
                description: 'Comma-separated values',
                size: 'Small file size',
              },
              {
                format: 'Excel',
                icon: '📊',
                description: 'Microsoft Excel format',
                size: 'Rich formatting',
              },
              {
                format: 'JSON',
                icon: '{ }',
                description: 'JavaScript Object Notation',
                size: 'API-friendly',
              },
              {
                format: 'PDF',
                icon: '📑',
                description: 'Portable Document Format',
                size: 'Print-ready',
              },
            ].map((format) => (
              <div
                key={format.format}
                className="p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors"
              >
                <div className="text-4xl mb-3 text-center">{format.icon}</div>
                <h4 className="font-semibold text-center mb-1">{format.format}</h4>
                <p className="text-xs text-muted-foreground text-center mb-1">
                  {format.description}
                </p>
                <p className="text-xs text-muted-foreground text-center">{format.size}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>Additional export settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">Include column headers</span>
              </label>
            </div>
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">Remove duplicates</span>
              </label>
            </div>
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Encrypt file</span>
              </label>
            </div>
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Compress (ZIP)</span>
              </label>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">File Name</label>
            <input
              type="text"
              placeholder="export-leads-2024-01-15"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Character Encoding</label>
            <select className="w-full px-3 py-2 border rounded-lg">
              <option>UTF-8</option>
              <option>UTF-16</option>
              <option>ASCII</option>
              <option>ISO-8859-1</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Export Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Export Summary</CardTitle>
          <CardDescription>Review your export configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Data Type</span>
              <Badge>Leads</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Records</span>
              <span className="text-sm">12,450</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Fields</span>
              <span className="text-sm">12 selected</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Filters Applied</span>
              <span className="text-sm">2 filters</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Format</span>
              <Badge>CSV</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Estimated Size</span>
              <span className="text-sm">~2.3 MB</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button variant="outline">Save as Template</Button>
            <div className="flex space-x-2">
              <Button variant="outline">Preview</Button>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Exports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Exports</CardTitle>
          <CardDescription>Your export history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                type: 'Leads',
                format: 'CSV',
                records: 12450,
                date: '2 days ago',
                size: '2.3 MB',
              },
              {
                type: 'Campaigns',
                format: 'Excel',
                records: 234,
                date: '5 days ago',
                size: '567 KB',
              },
              {
                type: 'Activities',
                format: 'JSON',
                records: 5670,
                date: '1 week ago',
                size: '1.8 MB',
              },
            ].map((exportItem, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{exportItem.type}</h4>
                    <p className="text-xs text-muted-foreground">
                      {exportItem.records.toLocaleString()} records • {exportItem.format} •{' '}
                      {exportItem.size}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">{exportItem.date}</span>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataExportWizard;
