import { FileText, Plus, Copy, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

const CampaignTemplates = () => {
  const templates = [
    {
      id: 1,
      name: 'Welcome Email Series',
      type: 'Email',
      category: 'Onboarding',
      description: '3-part welcome email sequence for new subscribers',
      usageCount: 45,
      lastUsed: '2 days ago',
    },
    {
      id: 2,
      name: 'Flash Sale Alert',
      type: 'SMS',
      category: 'Promotion',
      description: 'Quick SMS template for time-sensitive offers',
      usageCount: 32,
      lastUsed: '1 week ago',
    },
    {
      id: 3,
      name: 'Product Launch Announcement',
      type: 'Email',
      category: 'Product',
      description: 'Professional template for new product releases',
      usageCount: 28,
      lastUsed: '3 days ago',
    },
    {
      id: 4,
      name: 'Customer Survey Request',
      type: 'Email',
      category: 'Feedback',
      description: 'Collect customer feedback and testimonials',
      usageCount: 56,
      lastUsed: '1 day ago',
    },
    {
      id: 5,
      name: 'Appointment Reminder',
      type: 'SMS',
      category: 'Reminder',
      description: 'Automated appointment confirmation and reminder',
      usageCount: 89,
      lastUsed: 'Today',
    },
    {
      id: 6,
      name: 'Re-engagement Campaign',
      type: 'Email',
      category: 'Retention',
      description: 'Win back inactive customers with special offers',
      usageCount: 23,
      lastUsed: '5 days ago',
    },
  ];

  const categories = ['All', 'Onboarding', 'Promotion', 'Product', 'Feedback', 'Reminder', 'Retention'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Templates</h1>
          <p className="text-muted-foreground mt-2">
            Pre-built templates to speed up campaign creation
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">Across all types</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">16</div>
            <p className="text-xs text-muted-foreground">Ready to use</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMS Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Quick send</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Used</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">Appointment Reminder</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {categories.map((category) => (
                <Button key={category} variant="outline" size="sm">
                  {category}
                </Button>
              ))}
            </div>
            <Input placeholder="Search templates..." className="w-64" />
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="outline">{template.type}</Badge>
                </div>
                <Badge variant="secondary">{template.category}</Badge>
              </div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <span>Used {template.usageCount} times</span>
                <span>Last: {template.lastUsed}</span>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create New Template */}
      <Card>
        <CardHeader>
          <CardTitle>Create Custom Template</CardTitle>
          <CardDescription>Build reusable templates for your campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-6 border-2 border-dashed rounded-lg hover:bg-accent cursor-pointer text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h4 className="font-medium mb-1">Email Template</h4>
              <p className="text-sm text-muted-foreground">Create email campaign template</p>
            </div>
            <div className="p-6 border-2 border-dashed rounded-lg hover:bg-accent cursor-pointer text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h4 className="font-medium mb-1">SMS Template</h4>
              <p className="text-sm text-muted-foreground">Create SMS message template</p>
            </div>
            <div className="p-6 border-2 border-dashed rounded-lg hover:bg-accent cursor-pointer text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h4 className="font-medium mb-1">Phone Script</h4>
              <p className="text-sm text-muted-foreground">Create call script template</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignTemplates;
