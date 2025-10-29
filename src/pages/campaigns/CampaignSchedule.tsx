import { useState, useEffect } from 'react';
import { Calendar, Send, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { campaignsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

const CampaignSchedule = () => {
  const { toast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scheduledCampaigns, setScheduledCampaigns] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sentCampaigns, setSentCampaigns] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recurringCampaigns, setRecurringCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    scheduled: 0,
    totalRecipients: 0,
    recurring: 0,
    nextCampaign: '',
  });

  useEffect(() => {
    loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      // Fetch all campaigns
      const response = await campaignsApi.getCampaigns();
      const campaigns = response.data || [];

      // Filter scheduled campaigns (status: scheduled or paused)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scheduled = campaigns.filter((c: any) => 
        c.status === 'scheduled' || c.status === 'paused'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ).map((c: any) => ({
        ...c,
        type: c.type.charAt(0).toUpperCase() + c.type.slice(1),
        scheduledDate: new Date(c.scheduledDate || c.createdAt).toLocaleDateString(),
        scheduledTime: new Date(c.scheduledDate || c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recipients: c.recipientCount || 0,
      }));

      // Filter sent campaigns
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sent = campaigns.filter((c: any) => 
        c.status === 'sent' || c.status === 'completed'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ).map((c: any) => ({
        ...c,
        type: c.type.charAt(0).toUpperCase() + c.type.slice(1),
        sentDate: new Date(c.sentAt || c.updatedAt).toLocaleDateString(),
        sentTime: new Date(c.sentAt || c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recipients: c.recipientCount || 0,
        opened: Math.floor((c.recipientCount || 0) * 0.36), // Mock open rate ~36%
        clicked: Math.floor((c.recipientCount || 0) * 0.10), // Mock click rate ~10%
      })).slice(0, 5);

      // Mock recurring schedules (would need backend support for true recurring campaigns)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recurring = campaigns.filter((c: any) => c.name.toLowerCase().includes('weekly') || c.name.toLowerCase().includes('monthly')).slice(0, 3);

      setScheduledCampaigns(scheduled);
      setSentCampaigns(sent);
      setRecurringCampaigns(recurring);

      // Calculate stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalRecipients = scheduled.reduce((sum: number, c: any) => sum + (c.recipients || 0), 0);
      const nextCampaign = scheduled.length > 0 ? scheduled[0] : null;

      setStats({
        scheduled: scheduled.length,
        totalRecipients,
        recurring: recurring.length,
        nextCampaign: nextCampaign ? `${nextCampaign.scheduledDate} at ${nextCampaign.scheduledTime}` : 'None',
      });
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaign schedule');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Schedule</h1>
          <p className="text-muted-foreground mt-2">
            Manage scheduled and recurring campaigns
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={loadCampaigns} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Campaign
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Campaigns</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">Ready to send</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecipients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recurring Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recurring}</div>
            <p className="text-xs text-muted-foreground">Active schedules</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Campaign</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.nextCampaign ? 'Scheduled' : 'None'}</div>
            <p className="text-xs text-muted-foreground">{stats.nextCampaign || 'No upcoming'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Scheduled Campaigns</CardTitle>
          <CardDescription>Campaigns ready to send at scheduled times</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scheduledCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{campaign.name}</h4>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                      <Badge variant="secondary">{campaign.type}</Badge>
                      <span>•</span>
                      <span>
                        {campaign.scheduledDate} at {campaign.scheduledTime}
                      </span>
                      <span>•</span>
                      <span>{campaign.recipients.toLocaleString()} recipients</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    Reschedule
                  </Button>
                  <Button variant="outline" size="sm">
                    Send Now
                  </Button>
                  <Button variant="ghost" size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recurring Schedules */}
      <Card>
        <CardHeader>
          <CardTitle>Recurring Campaign Schedules</CardTitle>
          <CardDescription>Automatically scheduled campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recurringCampaigns.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recurring campaigns found</p>
            ) : (
              recurringCampaigns.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{schedule.name}</h4>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                        <Badge variant="secondary">{schedule.type}</Badge>
                        <span>•</span>
                        <span>{schedule.recipientCount || 0} recipients</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Next send: {new Date(schedule.scheduledDate || schedule.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      Edit Schedule
                    </Button>
                    <Button variant="ghost" size="sm">
                      Pause
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recently Sent */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Sent Campaigns</CardTitle>
          <CardDescription>Campaigns sent in the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sentCampaigns.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recently sent campaigns</p>
            ) : (
              sentCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100">
                      <Send className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{campaign.name}</h4>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                        <Badge variant="secondary">{campaign.type}</Badge>
                        <span>•</span>
                        <span>
                          {campaign.sentDate} at {campaign.sentTime}
                        </span>
                        <span>•</span>
                        <span>{campaign.recipients.toLocaleString()} sent</span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                        <span>
                          Opened: {campaign.opened} (
                          {((campaign.opened / campaign.recipients) * 100).toFixed(1)}%)
                        </span>
                        <span>
                          Clicked: {campaign.clicked} (
                          {((campaign.clicked / campaign.recipients) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Report
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schedule New Campaign */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule New Campaign</CardTitle>
          <CardDescription>Set up a new scheduled campaign</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Campaign Name</label>
              <input
                type="text"
                placeholder="Enter campaign name"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Campaign Type</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Email Campaign</option>
                <option>SMS Campaign</option>
                <option>Phone Campaign</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Send Date</label>
              <input type="date" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Send Time</label>
              <input type="time" className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Make this a recurring campaign</span>
            </label>
          </div>
          <div className="flex space-x-2">
            <Button>Schedule Campaign</Button>
            <Button variant="outline">Save as Draft</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignSchedule;
