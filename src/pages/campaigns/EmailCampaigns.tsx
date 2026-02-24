import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Mail, Send, Calendar, Users, FileText, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { campaignsApi } from '@/lib/api';
import { CampaignsSubNav } from '@/components/campaigns/CampaignsSubNav';
import type { Campaign } from '@/types';

const EmailCampaigns = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: emailData, isFetching: isLoading, refetch: loadCampaigns } = useQuery({
    queryKey: ['emailCampaigns'],
    queryFn: async () => {
      const response = await campaignsApi.getCampaigns({ type: 'EMAIL', limit: 50 });
      const emailCampaigns = response.data?.campaigns || response.campaigns || [];
      
      // Calculate stats from real data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scheduled = emailCampaigns.filter((c: any) => c.status === 'SCHEDULED').length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalSent = emailCampaigns.reduce((sum: number, c: any) => sum + (c.sent || c.recipientCount || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalOpened = emailCampaigns.reduce((sum: number, c: any) => sum + (c.opens || c.opened || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalClicked = emailCampaigns.reduce((sum: number, c: any) => sum + (c.clicks || c.clicked || 0), 0);

      return {
        campaigns: emailCampaigns,
        stats: {
          total: response.data?.pagination?.total || emailCampaigns.length,
          openRate: totalSent > 0 ? parseFloat(((totalOpened / totalSent) * 100).toFixed(1)) : 0,
          clickRate: totalSent > 0 ? parseFloat(((totalClicked / totalSent) * 100).toFixed(1)) : 0,
          scheduled,
        },
      };
    },
  });
  const campaigns = emailData?.campaigns ?? [];
  const stats = emailData?.stats ?? { total: 0, openRate: 0, clickRate: 0, scheduled: 0 };

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <CampaignsSubNav />

      {isLoading && campaigns.length === 0 && (
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
          </div>
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-muted-foreground mt-2">Create and manage email marketing campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { loadCampaigns(); }} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => navigate('/campaigns/create?type=email')}>
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
            <p className="text-xs text-muted-foreground">{stats.total > 0 ? 'From your campaigns' : 'No data yet'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Click Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clickRate}%</div>
            <p className="text-xs text-muted-foreground">{stats.total > 0 ? 'From your campaigns' : 'No data yet'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">Upcoming scheduled</p>
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
            <Input
              placeholder="Search campaigns..."
              className="w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaigns
              .filter((campaign: Campaign) => {
                if (activeTab === 'all') return true;
                const status = (campaign.status || '').toUpperCase();
                if (activeTab === 'sent') return status === 'COMPLETED' || status === 'ACTIVE';
                if (activeTab === 'scheduled') return status === 'SCHEDULED';
                if (activeTab === 'draft') return status === 'DRAFT';
                return true;
              })
              .filter((campaign: Campaign) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (campaign.name || '').toLowerCase().includes(q) ||
                       (campaign.subject || '').toLowerCase().includes(q);
              })
              .map((campaign: Campaign) => (
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
                          campaign.status?.toUpperCase() === 'COMPLETED' || campaign.status?.toUpperCase() === 'ACTIVE'
                            ? 'success'
                            : campaign.status?.toUpperCase() === 'SCHEDULED'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{campaign.subject}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Date: {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'N/A'}</span>
                      {(campaign.status?.toUpperCase() === 'COMPLETED' || campaign.status?.toUpperCase() === 'ACTIVE') && (
                        <>
                          <span>Sent: {campaign.sent}</span>
                          <span>Opened: {campaign.opened}</span>
                          <span>Clicked: {campaign.clicked}</span>
                        </>
                      )}
                      {campaign.status?.toUpperCase() !== 'COMPLETED' && campaign.status?.toUpperCase() !== 'ACTIVE' && <span>Recipients: {campaign.audience || 0}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                    View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}>
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
