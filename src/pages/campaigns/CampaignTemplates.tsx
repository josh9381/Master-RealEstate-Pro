import { FileText, Plus, Copy, Edit, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useState, useEffect } from 'react';
import { campaignsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

const CampaignTemplates = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    email: 0,
    sms: 0,
    phone: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      // Fetch all campaigns to use as templates
      const response = await campaignsApi.getCampaigns({ limit: 100 });
      const campaigns = response.data || [];
      
      // Transform campaigns into template format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const templateList = campaigns.map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        type: campaign.type === 'email' ? 'Email' : campaign.type === 'sms' ? 'SMS' : 'Phone',
        category: campaign.status === 'completed' ? 'Proven' : 'Draft',
        description: campaign.content?.substring(0, 60) || 'Campaign template',
        usageCount: 0, // Mock - no endpoint for this
        lastUsed: campaign.updatedAt ? new Date(campaign.updatedAt).toLocaleDateString() : 'Never',
        subject: campaign.subject,
        content: campaign.content,
        status: campaign.status
      }));
      
      setTemplates(templateList);
      
      // Calculate stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emailCount = campaigns.filter((c: any) => c.type === 'email').length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const smsCount = campaigns.filter((c: any) => c.type === 'sms').length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const phoneCount = campaigns.filter((c: any) => c.type === 'phone').length;
      
      setStats({
        total: campaigns.length,
        email: emailCount,
        sms: smsCount,
        phone: phoneCount
      });
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async (templateId: number) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    try {
      await campaignsApi.createCampaign({
        name: `${template.name} (Copy)`,
        type: template.type.toLowerCase() as 'email' | 'sms' | 'phone',
        status: 'draft',
        subject: template.subject,
        content: template.content
      });
      toast.success(`Template "${template.name}" duplicated`);
      loadTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const categories = ['All', 'Email', 'SMS', 'Phone', 'Proven', 'Draft'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Templates</h1>
          <p className="text-muted-foreground mt-2">
            Pre-built templates to speed up campaign creation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadTemplates} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Across all types</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.email}</div>
            <p className="text-xs text-muted-foreground">Ready to use</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMS Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sms}</div>
            <p className="text-xs text-muted-foreground">Quick send</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phone Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.phone}</div>
            <p className="text-xs text-muted-foreground">Voice campaigns</p>
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
                <span>Status: {template.status}</span>
                <span>Updated: {template.lastUsed}</span>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDuplicate(template.id)}>
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
