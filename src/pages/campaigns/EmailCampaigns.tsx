import { useState, useEffect } from 'react';
import { Mail, Send, Calendar, Users, FileText, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { campaignsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

const EmailCampaigns = () => {
  const [activeTab, setActiveTab] = useState('all');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    openRate: 0,
    clickRate: 0,
    scheduled: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadCampaigns();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const response = await campaignsApi.getCampaigns({ type: 'email', limit: 50 });
      const emailCampaigns = response.data || [];
      
      setCampaigns(emailCampaigns);
      
      // Calculate stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scheduled = emailCampaigns.filter((c: any) => c.status === 'scheduled').length;
      setStats({
        total: response.total || 0,
        openRate: 32.0, // Mock - no endpoint for this
        clickRate: 8.0, // Mock - no endpoint for this
        scheduled
      });
    } catch (error) {
      console.error('Error loading email campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-muted-foreground mt-2">Create and manage email marketing campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCampaigns} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Send className="h-4 w-4 mr-2" />
            Create Email Campaign
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Email campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openRate}%</div>
            <p className="text-xs text-muted-foreground">Industry average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Click Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clickRate}%</div>
            <p className="text-xs text-muted-foreground">Industry average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button
                variant={activeTab === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('all')}
              >
                All
              </Button>
              <Button
                variant={activeTab === 'sent' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('sent')}
              >
                Sent
              </Button>
              <Button
                variant={activeTab === 'scheduled' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('scheduled')}
              >
                Scheduled
              </Button>
              <Button
                variant={activeTab === 'draft' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('draft')}
              >
                Drafts
              </Button>
            </div>
            <Input placeholder="Search campaigns..." className="w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
              >
                <div className="flex items-start space-x-4 flex-1">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{campaign.name}</h4>
                      <Badge
                        variant={
                          campaign.status === 'sent'
                            ? 'success'
                            : campaign.status === 'scheduled'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{campaign.subject}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Date: {campaign.date}</span>
                      {campaign.status === 'sent' && (
                        <>
                          <span>Sent: {campaign.sent}</span>
                          <span>Opened: {campaign.opened}</span>
                          <span>Clicked: {campaign.clicked}</span>
                        </>
                      )}
                      {campaign.status !== 'sent' && <span>Recipients: {campaign.recipients}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                  <Button variant="ghost" size="sm">
                    Edit
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

export default EmailCampaigns;
