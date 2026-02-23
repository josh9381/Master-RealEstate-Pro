import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Send, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { campaignsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { CampaignsSubNav } from '@/components/campaigns/CampaignsSubNav';

const CampaignSchedule = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
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

  // Reschedule modal state
  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean;
    campaignId: string;
    campaignName: string;
    currentDate: string;
  }>({
    isOpen: false,
    campaignId: '',
    campaignName: '',
    currentDate: '',
  });
  const [newScheduleDate, setNewScheduleDate] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');

  useEffect(() => {
    loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      // Fetch all campaigns
      const response = await campaignsApi.getCampaigns();
      const campaigns = response.data?.campaigns || [];

      // Filter scheduled campaigns (status: SCHEDULED or PAUSED - uppercase from backend)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scheduled = campaigns.filter((c: any) => 
        c.status === 'SCHEDULED' || c.status === 'PAUSED'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ).map((c: any) => ({
        ...c,
        type: c.type, // Already uppercase from backend
        scheduledDate: c.startDate ? new Date(c.startDate).toLocaleDateString() : new Date(c.createdAt).toLocaleDateString(),
        scheduledTime: c.startDate ? new Date(c.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recipients: c.audience || 0,
      }));

      // Filter completed campaigns
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sent = campaigns.filter((c: any) => 
        c.status === 'COMPLETED' || c.status === 'ACTIVE'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ).map((c: any) => ({
        ...c,
        type: c.type,
        sentDate: c.endDate ? new Date(c.endDate).toLocaleDateString() : new Date(c.updatedAt).toLocaleDateString(),
        sentTime: c.endDate ? new Date(c.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recipients: c.sent || 0,
        opened: c.opened || 0,
        clicked: c.clicked || 0,
      })).slice(0, 5);

      // Recurring campaigns (use isRecurring field from backend)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recurring = campaigns.filter((c: any) => 
        c.isRecurring === true || 
        ((c.name.toLowerCase().includes('weekly') || c.name.toLowerCase().includes('monthly')) && 
        (c.status === 'SCHEDULED' || c.status === 'ACTIVE'))
      ).slice(0, 3);

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

  const handleSendNow = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Send "${campaignName}" immediately to all recipients?`)) {
      return;
    }

    try {
      setIsLoading(true);
      const result = await campaignsApi.sendCampaignNow(campaignId);
      
      toast.success(`Campaign "${campaignName}" sent successfully! Sent to ${result.data.sent} recipients.`);
      
      // Reload campaigns to update UI
      await loadCampaigns();
    } catch (error: any) {
      console.error('Error sending campaign:', error);
      toast.error(error.response?.data?.message || 'Failed to send campaign');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelCampaign = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Cancel scheduled campaign "${campaignName}"?`)) {
      return;
    }

    try {
      setIsLoading(true);
      await campaignsApi.updateCampaign(campaignId, { status: 'CANCELLED' });
      
      toast.success(`Campaign "${campaignName}" cancelled`);
      
      // Reload campaigns to update UI
      await loadCampaigns();
    } catch (error: any) {
      console.error('Error cancelling campaign:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel campaign');
    } finally {
      setIsLoading(false);
    }
  };

  const openRescheduleModal = (campaign: any) => {
    const currentDate = campaign.startDate || campaign.createdAt;
    const dateObj = new Date(currentDate);
    
    setRescheduleModal({
      isOpen: true,
      campaignId: campaign.id,
      campaignName: campaign.name,
      currentDate: dateObj.toLocaleString(),
    });
    
    // Set initial values
    setNewScheduleDate(dateObj.toISOString().split('T')[0]);
    setNewScheduleTime(dateObj.toTimeString().slice(0, 5));
  };

  const closeRescheduleModal = () => {
    setRescheduleModal({
      isOpen: false,
      campaignId: '',
      campaignName: '',
      currentDate: '',
    });
    setNewScheduleDate('');
    setNewScheduleTime('');
  };

  const handleReschedule = async () => {
    if (!newScheduleDate || !newScheduleTime) {
      toast.error('Please select both date and time');
      return;
    }

    const newStartDate = new Date(`${newScheduleDate}T${newScheduleTime}:00`);
    
    if (newStartDate <= new Date()) {
      toast.error('Please select a future date and time');
      return;
    }

    try {
      setIsLoading(true);
      await campaignsApi.rescheduleCampaign(
        rescheduleModal.campaignId,
        newStartDate.toISOString()
      );
      
      toast.success(`Campaign "${rescheduleModal.campaignName}" rescheduled to ${newStartDate.toLocaleString()}`);
      
      closeRescheduleModal();
      await loadCampaigns();
    } catch (error: any) {
      console.error('Error rescheduling campaign:', error);
      toast.error(error.response?.data?.message || 'Failed to reschedule campaign');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <CampaignsSubNav />

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
          <Button onClick={() => navigate('/campaigns/create')}>
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openRescheduleModal(campaign)}
                    disabled={isLoading}
                  >
                    Reschedule
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSendNow(campaign.id, campaign.name)}
                    disabled={isLoading}
                  >
                    Send Now
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleCancelCampaign(campaign.id, campaign.name)}
                    disabled={isLoading}
                  >
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
                    <Button variant="outline" size="sm" onClick={() => {
                      setRescheduleModal({ isOpen: true, campaignId: schedule.id, campaignName: schedule.name, currentDate: schedule.scheduledDate || schedule.startDate || '' });
                    }}>
                      Edit Schedule
                    </Button>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      try {
                        await campaignsApi.pauseCampaign(String(schedule.id));
                        toast.success('Campaign paused successfully');
                        loadCampaigns();
                      } catch (err: any) {
                        toast.error(err.response?.data?.message || 'Failed to pause campaign');
                      }
                    }}>
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
          <CardDescription>Recently completed campaigns</CardDescription>
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
                          {campaign.recipients > 0 ? ((campaign.opened / campaign.recipients) * 100).toFixed(1) : '0.0'}%)
                        </span>
                        <span>
                          Clicked: {campaign.clicked} (
                          {campaign.recipients > 0 ? ((campaign.clicked / campaign.recipients) * 100).toFixed(1) : '0.0'}%)
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
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
          <p className="text-muted-foreground">Create a new campaign and set it to scheduled status to have it appear here.</p>
          <div className="flex space-x-2">
            <Button onClick={() => navigate('/campaigns/create')}>Create & Schedule Campaign</Button>
          </div>
        </CardContent>
      </Card>

      {/* Reschedule Modal */}
      {rescheduleModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Reschedule Campaign</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Campaign:</strong> {rescheduleModal.campaignName}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  <strong>Current schedule:</strong> {rescheduleModal.currentDate}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">New Date</label>
                <input
                  type="date"
                  value={newScheduleDate}
                  onChange={(e) => setNewScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">New Time</label>
                <input
                  type="time"
                  value={newScheduleTime}
                  onChange={(e) => setNewScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex space-x-2 mt-6">
              <Button 
                onClick={handleReschedule}
                disabled={isLoading}
              >
                {isLoading ? 'Rescheduling...' : 'Confirm Reschedule'}
              </Button>
              <Button 
                variant="outline" 
                onClick={closeRescheduleModal}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignSchedule;
