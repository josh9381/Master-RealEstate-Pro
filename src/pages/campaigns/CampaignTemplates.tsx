import { logger } from '@/lib/logger'
import { FileText, RefreshCw, Mail, MessageSquare, Phone, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { useState, useMemo } from 'react';
import { campaignsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { CampaignsSubNav } from '@/components/campaigns/CampaignsSubNav';
import { useQuery } from '@tanstack/react-query';

interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'EMAIL' | 'SMS' | 'PHONE';
  subject?: string;
  body: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  isRecurring: boolean;
  recurringPattern?: {
    daysOfWeek?: number[];
    time?: string;
    dayOfMonth?: number;
  };
  tags: string[];
  icon: string;
}

const CampaignTemplates = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CampaignTemplate | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['campaign-templates'],
    queryFn: async () => {
      const response = await campaignsApi.getTemplates();
      return (response.data?.templates || []) as CampaignTemplate[];
    },
  });

  const stats = useMemo(() => {
    const emailCount = templates.filter((t) => t.type === 'EMAIL').length;
    const smsCount = templates.filter((t) => t.type === 'SMS').length;
    const phoneCount = templates.filter((t) => t.type === 'PHONE').length;
    const recurringCount = templates.filter((t) => t.isRecurring).length;
    return {
      total: templates.length,
      email: emailCount,
      sms: smsCount,
      phone: phoneCount,
      recurring: recurringCount,
    };
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];
    
    // Filter by category
    if (selectedCategory !== 'All') {
      if (selectedCategory === 'Recurring') {
        filtered = filtered.filter(t => t.isRecurring);
      } else {
        filtered = filtered.filter(t => 
          t.category.toLowerCase() === selectedCategory.toLowerCase()
        );
      }
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        (t.description || '').toLowerCase().includes(query) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [templates, selectedCategory, searchQuery]);

  const handleUseTemplate = async (templateId: string) => {
    if (creatingTemplateId) return; // Prevent double-click
    try {
      setCreatingTemplateId(templateId);
      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      // Create campaign from template
      const response = await campaignsApi.createFromTemplate(templateId, {
        name: template.name
      });

      const campaignId = response.data?.campaign?.id;
      if (!campaignId) {
        toast.error('Campaign created but ID not returned');
        return;
      }
      toast.success(`Campaign created from template: ${template.name}`);
      
      // Navigate to edit the new campaign
      navigate(`/campaigns/${campaignId}/edit`);
    } catch (error) {
      logger.error('Error creating campaign from template:', error);
      toast.error('Failed to create campaign from template');
    } finally {
      setCreatingTemplateId(null);
    }
  };

  const categories = ['All', 'Newsletter', 'Alert', 'Event', 'Follow-up', 'Recurring'];

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <CampaignsSubNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Templates</h1>
          <p className="text-muted-foreground mt-2">
            Pre-built real estate campaign templates to speed up your marketing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Ready to use</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email</CardTitle>
            <Mail className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.email}</div>
            <p className="text-xs text-muted-foreground">Email campaigns</p>
          </CardContent>
        </Card>
        {stats.sms > 0 && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMS</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sms}</div>
            <p className="text-xs text-muted-foreground">Text messages</p>
          </CardContent>
        </Card>
        )}
        {stats.phone > 0 && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phone</CardTitle>
            <Phone className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.phone}</div>
            <p className="text-xs text-muted-foreground">Call scripts</p>
          </CardContent>
        </Card>
        )}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recurring</CardTitle>
            <RefreshCw className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recurring}</div>
            <p className="text-xs text-muted-foreground">Automated</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {categories.map((category) => (
                <Button 
                  key={category} 
                  variant={selectedCategory === category ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
            <Input 
              placeholder="Search templates..." 
              className="w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No templates found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try adjusting your search' : 'Select a different category'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-all hover:scale-[1.02]">
              <CardHeader>
                <div className="flex items-start justify-between mb-3">
                  <div className="text-4xl">{template.icon}</div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant="outline">{template.type}</Badge>
                    {template.isRecurring && (
                      <Badge variant="secondary" className="text-xs">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        {template.frequency}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2">{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.tags.slice(0, 3).map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                {template.subject && (
                  <div className="text-xs text-muted-foreground mb-4 p-2 bg-muted rounded">
                    <span className="font-medium">Subject:</span> {template.subject.length > 50 ? `${template.subject.substring(0, 50)}…` : template.subject}
                  </div>
                )}
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1" 
                    onClick={() => handleUseTemplate(template.id)}
                    disabled={creatingTemplateId === template.id}
                  >
                    {creatingTemplateId === template.id ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    {creatingTemplateId === template.id ? 'Creating...' : 'Use Template'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{previewTemplate?.icon}</span>
              <div>
                <DialogTitle>{previewTemplate?.name}</DialogTitle>
                <DialogDescription>{previewTemplate?.description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{previewTemplate.type}</Badge>
                <Badge variant="secondary">{previewTemplate.category}</Badge>
                {previewTemplate.isRecurring && (
                  <Badge variant="secondary">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {previewTemplate.frequency}
                  </Badge>
                )}
              </div>
              {previewTemplate.subject && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Subject</p>
                  <div className="p-3 bg-muted rounded-md text-sm">{previewTemplate.subject}</div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Body</p>
                <pre className="p-4 bg-muted rounded-md text-sm whitespace-pre-wrap font-sans leading-relaxed max-h-[40vh] overflow-y-auto">
                  {previewTemplate.body}
                </pre>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {previewTemplate.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewTemplate) {
                  handleUseTemplate(previewTemplate.id);
                  setPreviewTemplate(null);
                }
              }}
              disabled={!!creatingTemplateId}
            >
              <FileText className="h-4 w-4 mr-2" />
              Use Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default CampaignTemplates;
