import { MessageSquare, Send, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useState, useEffect } from 'react';
import { campaignsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

const SMSCampaigns = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [smsCampaigns, setSmsCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    deliveryRate: 99.4,
    clickRate: 16.0,
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
      const response = await campaignsApi.getCampaigns({ type: 'sms', limit: 50 });
      const campaigns = response.data || [];
      
      setSmsCampaigns(campaigns);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scheduled = campaigns.filter((c: any) => c.status === 'scheduled').length;
      setStats({
        total: response.total || 0,
        deliveryRate: 99.4, // Mock
        clickRate: 16.0, // Mock
        scheduled
      });
    } catch (error) {
      console.error('Error loading SMS campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SMS Campaigns</h1>
          <p className="text-muted-foreground mt-2">Send targeted SMS messages to your contacts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCampaigns} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
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
            <p className="text-xs text-muted-foreground">Average rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clickRate}%</div>
            <p className="text-xs text-muted-foreground">Average rate</p>
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
              <Input placeholder="Select contacts or enter phone numbers..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <textarea
                className="w-full min-h-[100px] p-3 border rounded-md"
                placeholder="Type your message here..."
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground mt-1">0 / 160 characters</p>
            </div>
            <div className="flex space-x-2">
              <Button>Send Now</Button>
              <Button variant="outline">Schedule</Button>
              <Button variant="ghost">Save as Draft</Button>
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
            {smsCampaigns.map((campaign) => (
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
                    <p className="text-sm text-muted-foreground mb-2">{campaign.message}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Date: {campaign.date}</span>
                      {campaign.status === 'sent' ? (
                        <>
                          <span>Sent: {campaign.sent}</span>
                          <span>Delivered: {campaign.delivered}</span>
                          <span>Clicked: {campaign.clicked}</span>
                        </>
                      ) : (
                        <span>Recipients: {campaign.recipients}</span>
                      )}
                    </div>
                  </div>
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

export default SMSCampaigns;
