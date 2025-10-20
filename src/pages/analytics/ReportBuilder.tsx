import { Layout, Plus, Settings, TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const ReportBuilder = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Report Builder</h1>
          <p className="text-muted-foreground mt-2">
            Create custom reports with drag-and-drop interface
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">Load Template</Button>
          <Button>Save Report</Button>
        </div>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>Set up your report basics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Report Name</label>
              <input
                type="text"
                placeholder="My Custom Report"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Report Category</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Sales</option>
                <option>Marketing</option>
                <option>Analytics</option>
                <option>Financial</option>
                <option>Custom</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <textarea
              rows={2}
              placeholder="Describe what this report shows..."
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Data Sources */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Data Sources</CardTitle>
            <CardDescription>Drag sources to canvas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { name: 'Leads', icon: TrendingUp, count: 4567 },
                { name: 'Campaigns', icon: BarChart3, count: 23 },
                { name: 'Contacts', icon: Layout, count: 8901 },
                { name: 'Tasks', icon: Settings, count: 234 },
              ].map((source) => (
                <div
                  key={source.name}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-move hover:border-primary transition-colors"
                  draggable
                >
                  <div className="flex items-center space-x-2">
                    <source.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{source.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{source.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Report Canvas */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Report Canvas</CardTitle>
            <CardDescription>Build your report layout</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 min-h-[400px] bg-muted/20">
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Start Building Your Report</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Drag data sources and widgets from the sidebar to create your custom report
                  layout
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Widgets Palette */}
      <Card>
        <CardHeader>
          <CardTitle>Available Widgets</CardTitle>
          <CardDescription>Drag widgets to add visualizations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            {[
              { name: 'Table', icon: '📊' },
              { name: 'Bar Chart', icon: '📊' },
              { name: 'Line Chart', icon: '📈' },
              { name: 'Pie Chart', icon: '🥧' },
              { name: 'Number Card', icon: '🔢' },
              { name: 'Gauge', icon: '⏱️' },
              { name: 'Map', icon: '🗺️' },
              { name: 'Timeline', icon: '📅' },
              { name: 'Funnel', icon: '🔻' },
              { name: 'Heatmap', icon: '🔥' },
              { name: 'Scatter Plot', icon: '⭐' },
              { name: 'Area Chart', icon: '📉' },
            ].map((widget) => (
              <div
                key={widget.name}
                className="p-4 border rounded-lg text-center cursor-move hover:border-primary transition-colors"
                draggable
              >
                <div className="text-3xl mb-2">{widget.icon}</div>
                <p className="text-xs font-medium">{widget.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters & Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Parameters</CardTitle>
          <CardDescription>Control what data is displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>This year</option>
                <option>Custom range</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status Filter</label>
              <select className="w-full px-3 py-2 border rounded-lg" multiple>
                <option>New</option>
                <option>Contacted</option>
                <option>Qualified</option>
                <option>Converted</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Assigned To</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>All Users</option>
                <option>John Doe</option>
                <option>Sarah Johnson</option>
                <option>Mike Wilson</option>
              </select>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Filter
          </Button>
        </CardContent>
      </Card>

      {/* Grouping & Sorting */}
      <Card>
        <CardHeader>
          <CardTitle>Grouping & Sorting</CardTitle>
          <CardDescription>Organize your report data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Group By</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>None</option>
                <option>Date</option>
                <option>Status</option>
                <option>User</option>
                <option>Campaign</option>
                <option>Source</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Date (Newest)</option>
                <option>Date (Oldest)</option>
                <option>Value (High to Low)</option>
                <option>Value (Low to High)</option>
                <option>Name (A-Z)</option>
                <option>Name (Z-A)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formatting Options */}
      <Card>
        <CardHeader>
          <CardTitle>Formatting Options</CardTitle>
          <CardDescription>Customize report appearance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Color Scheme</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Default</option>
                <option>Blue</option>
                <option>Green</option>
                <option>Purple</option>
                <option>Monochrome</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Font Size</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Small</option>
                <option>Medium</option>
                <option>Large</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Layout</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Single Column</option>
                <option>Two Columns</option>
                <option>Grid</option>
                <option>Custom</option>
              </select>
            </div>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Show grid lines</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Include company logo</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Show page numbers</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Calculated Fields</CardTitle>
          <CardDescription>Add custom calculations to your report</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Available Functions</h4>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Calculation
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'MEDIAN', '%', 'RATE'].map((func) => (
                <Badge key={func} variant="outline" className="cursor-pointer">
                  {func}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Report Actions</CardTitle>
          <CardDescription>Schedule, export, or share your report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button className="h-auto py-4 flex-col">
              <Settings className="h-6 w-6 mb-2" />
              <span className="font-semibold">Schedule Report</span>
              <span className="text-xs text-muted-foreground mt-1">
                Run automatically
              </span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col">
              <Layout className="h-6 w-6 mb-2" />
              <span className="font-semibold">Export Report</span>
              <span className="text-xs text-muted-foreground mt-1">
                PDF, Excel, CSV
              </span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col">
              <TrendingUp className="h-6 w-6 mb-2" />
              <span className="font-semibold">Share Report</span>
              <span className="text-xs text-muted-foreground mt-1">
                With team members
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportBuilder;
