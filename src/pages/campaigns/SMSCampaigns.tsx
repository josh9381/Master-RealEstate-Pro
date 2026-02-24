import { MessageSquare, Send, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { campaignsApi, CreateCampaignData } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { CampaignsSubNav } from '@/components/campaigns/CampaignsSubNav';
import type { Campaign } from '@/types';

const SMSCampaigns = () => {
  const [smsMessage, setSmsMessage] = useState('');
  const [smsRecipients, setSmsRecipients] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: smsData, isFetching: isLoading, refetch: loadCampaigns } = useQuery({
    queryKey: ['smsCampaigns'],
    queryFn: async () => {
      const response = await campaignsApi.getCampaigns({ type: 'SMS', limit: 50 });
      const campaigns = response.data?.campaigns || response.campaigns || [];
      
      const scheduled = campaigns.filter((c: Campaign) => c.status === 'SCHEDULED').length;
      const totalSent = campaigns.reduce((sum: number, c: Campaign) => sum + (c.sent || c.recipientCount || 0), 0);
      const totalDelivered = campaigns.reduce((sum: number, c: Campaign) => sum + (c.delivered || c.sent || 0), 0);
      const totalClicked = campaigns.reduce((sum: number, c: Campaign) => sum + (c.clicks || c.clicked || 0), 0);

      return {
        smsCampaigns: campaigns,
        stats: {
          total: response.data?.pagination?.total || campaigns.length,
          deliveryRate: totalSent > 0 ? parseFloat(((totalDelivered / totalSent) * 100).toFixed(1)) : 0,
          clickRate: totalSent > 0 ? parseFloat(((totalClicked / totalSent) * 100).toFixed(1)) : 0,
          scheduled,
        },
      };
    },
  });
  const smsCampaigns = smsData?.smsCampaigns ?? [];
  const stats = smsData?.stats ?? { total: 0, deliveryRate: 0, clickRate: 0, scheduled: 0 };

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <CampaignsSubNav />

      {isLoading && smsCampaigns.length === 0 && (
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
          <h1 className="text-3xl font-bold">SMS Campaigns</h1>
          <p className="text-muted-foreground mt-2">Send targeted SMS messages to your contacts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { loadCampaigns(); }} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => navigate('/campaigns/create?type=sms')}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Create SMS Campaign
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">SMS campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deliveryRate}%</div>
            <p className="text-xs text-muted-foreground">{stats.total > 0 ? 'From your campaigns' : 'No data yet'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clickRate}%</div>
            <p className="text-xs text-muted-foreground">{stats.total > 0 ? 'From your campaigns' : 'No data yet'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">Going out soon</p>
          </CardContent>
        </Card>
      </div>

      {/* SMS Composer */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Send SMS</CardTitle>
          <CardDescription>Send a quick SMS to selected contacts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Recipients</label>
              <Input
                placeholder="Enter phone numbers separated by commas..."
                value={smsRecipients}
                onChange={(e) => setSmsRecipients(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <textarea
                className="w-full min-h-[100px] p-3 border rounded-md"
                placeholder="Type your message here..."
                maxLength={160}
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">{smsMessage.length} / 160 characters</p>
            </div>
            <div className="flex space-x-2">
              <Button
                disabled={!smsMessage.trim() || !smsRecipients.trim()}
                onClick={async () => {
                  try {
                    const campaign = await campaignsApi.createCampaign({
                      name: `Quick SMS - ${new Date().toLocaleDateString()}`,
                      type: 'SMS',
                      body: smsMessage,
                      recipients: smsRecipients.split(',').map(r => r.trim()).filter(Boolean),
                      status: 'ACTIVE',
                    } as CreateCampaignData);
                    if (campaign?.data?.campaign?.id) {
                      await campaignsApi.sendCampaign(String(campaign.data.campaign.id));
                    }
                    toast.success('SMS campaign sent!');
                    setSmsMessage('');
                    loadCampaigns();
                  } catch {
                    toast.error('Failed to send SMS campaign');
                  }
                }}
              >Send Now</Button>
              <Button
                variant="outline"
                disabled={!smsMessage.trim()}
                onClick={async () => {
                  try {
                    await campaignsApi.createCampaign({
                      name: `Quick SMS - ${new Date().toLocaleDateString()}`,
                      type: 'SMS',
                      body: smsMessage,
                      status: 'SCHEDULED',
                      recipients: smsRecipients.split(',').map(r => r.trim()).filter(Boolean),
                    } as CreateCampaignData);
                    toast.success('SMS campaign scheduled!');
                    setSmsMessage('');
                    loadCampaigns();
                  } catch {
                    toast.error('Failed to schedule SMS campaign');
                  }
                }}
              >Schedule</Button>
              <Button
                variant="ghost"
                disabled={!smsMessage.trim()}
                onClick={async () => {
                  try {
                    await campaignsApi.createCampaign({
                      name: `Quick SMS Draft - ${new Date().toLocaleDateString()}`,
                      type: 'SMS',
                      body: smsMessage,
                      status: 'DRAFT',
                      recipients: smsRecipients.split(',').map(r => r.trim()).filter(Boolean),
                    } as CreateCampaignData);
                    toast.success('SMS draft saved!');
                    setSmsMessage('');
                    loadCampaigns();
                  } catch {
                    toast.error('Failed to save draft');
                  }
                }}
              >Save as Draft</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign List */}
      <Card>
        <CardHeader>
          <CardTitle>SMS Campaigns</CardTitle>
          <CardDescription>Manage your SMS marketing campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {smsCampaigns.map((campaign: Campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
              >
                <div className="flex items-start space-x-4 flex-1">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-green-600" />
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
                    <p className="text-sm text-muted-foreground mb-2">{campaign.body || campaign.subject}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Date: {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'N/A'}</span>
                      {(campaign.status?.toUpperCase() === 'COMPLETED' || campaign.status?.toUpperCase() === 'ACTIVE') ? (
                        <>
                          <span>Sent: {campaign.sent}</span>
                          <span>Delivered: {campaign.delivered || 0}</span>
                          <span>Clicked: {campaign.clicked}</span>
                        </>
                      ) : (
                        <span>Recipients: {campaign.audience || 0}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
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

export default SMSCampaigns;
