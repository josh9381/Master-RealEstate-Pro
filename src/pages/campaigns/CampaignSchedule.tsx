import { logger } from '@/lib/logger'
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, Send, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { campaignsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { CampaignsSubNav } from '@/components/campaigns/CampaignsSubNav';
import { formatRate, calcRate } from '@/lib/metricsCalculator';

interface CampaignRecord {
  id: string | number;
  name: string;
  type: string;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  audience?: number;
  sent?: number;
  opened?: number;
  clicked?: number;
  isRecurring?: boolean;
  frequency?: string;
  nextSendAt?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  sentDate?: string;
  sentTime?: string;
  recipients?: number;
  [key: string]: unknown;
}

const CampaignSchedule = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
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
  const [confirmAction, setConfirmAction] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  const { data: campaignData, isFetching: isLoading, refetch: loadCampaigns } = useQuery({
    queryKey: ['campaignSchedule'],
    queryFn: async () => {
      // Server-side filtering: fetch only the statuses we need
      const [scheduledRes, completedRes, activeRecurringRes] = await Promise.all([
        campaignsApi.getCampaigns({ status: 'SCHEDULED,PAUSED', sortBy: 'startDate', sortOrder: 'asc', limit: 50 }),
        campaignsApi.getCampaigns({ status: 'COMPLETED', sortBy: 'updatedAt', sortOrder: 'desc', limit: 5 }),
        campaignsApi.getCampaigns({ status: 'ACTIVE', sortBy: 'startDate', sortOrder: 'asc', limit: 50 }),
      ]);

      const scheduledRaw: CampaignRecord[] = (scheduledRes.data?.campaigns || []).filter(
        (c: CampaignRecord) => c.type !== 'SOCIAL' && c.type !== 'PHONE'
      );
      const completedRaw: CampaignRecord[] = (completedRes.data?.campaigns || []).filter(
        (c: CampaignRecord) => c.type !== 'SOCIAL' && c.type !== 'PHONE'
      );

      // Map scheduled campaigns (already sorted by startDate from server)
      const scheduled = scheduledRaw.map((c: CampaignRecord) => ({
        ...c,
        type: c.type,
        scheduledDate: c.startDate ? new Date(c.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        scheduledTime: c.startDate ? new Date(c.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recipients: c.audience || 0,
      }));

      // Map completed campaigns (already limited to 5 and sorted by server)
      const sent = completedRaw.map((c: CampaignRecord) => ({
        ...c,
        type: c.type,
        sentDate: c.endDate ? new Date(c.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date(c.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        sentTime: c.endDate ? new Date(c.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recipients: c.sent || 0,
        opened: c.opened || 0,
        clicked: c.clicked || 0,
      }));

      // Recurring campaigns: from scheduled results + active recurring results
      const activeRecurringRaw: CampaignRecord[] = (activeRecurringRes.data?.campaigns || []).filter(
        (c: CampaignRecord) => c.type !== 'SOCIAL' && c.type !== 'PHONE' && c.isRecurring === true
      );
      const scheduledRecurring = scheduledRaw.filter((c: CampaignRecord) => 
        c.isRecurring === true
      );
      const recurring = [...scheduledRecurring, ...activeRecurringRaw];

      // Calculate stats
      const totalRecipients = scheduled.reduce((sum: number, c: CampaignRecord) => sum + (c.recipients || 0), 0);
      const nextCampaign = scheduled.length > 0 ? scheduled[0] : null;

      return {
        scheduledCampaigns: scheduled,
        sentCampaigns: sent,
        recurringCampaigns: recurring,
        stats: {
          scheduled: scheduled.length,
          totalRecipients,
          recurring: recurring.length,
          nextCampaign: nextCampaign ? `${nextCampaign.scheduledDate} at ${nextCampaign.scheduledTime}` : 'None',
        },
      };
    },
    staleTime: 30_000,
  });
  const scheduledCampaigns = campaignData?.scheduledCampaigns ?? [];
  const sentCampaigns = campaignData?.sentCampaigns ?? [];
  const recurringCampaigns = campaignData?.recurringCampaigns ?? [];
  const stats = campaignData?.stats ?? { scheduled: 0, totalRecipients: 0, recurring: 0, nextCampaign: '' };

  const handleSendNow = async (campaignId: string, campaignName: string) => {
    const onConfirm = async () => {
      setConfirmAction(prev => ({ ...prev, isOpen: false }));
      try {
        const result = await campaignsApi.sendCampaignNow(campaignId);
        toast.success(`Campaign "${campaignName}" sent successfully! Sent to ${result.data.sent} recipients.`);
        await loadCampaigns();
      } catch (error: unknown) {
        logger.error('Error sending campaign:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to send campaign');
      }
    };
    setConfirmAction({
      isOpen: true,
      title: 'Send Now',
      message: `Send "${campaignName}" immediately to all recipients?`,
      onConfirm,
    });
  };

  const handleCancelCampaign = async (campaignId: string, campaignName: string) => {
    setConfirmAction({
      isOpen: true,
      title: 'Cancel Campaign',
      message: `Cancel scheduled campaign "${campaignName}"?`,
      onConfirm: async () => {
        setConfirmAction(prev => ({ ...prev, isOpen: false }));
        try {
          await campaignsApi.updateCampaign(campaignId, { status: 'CANCELLED' });
          toast.success(`Campaign "${campaignName}" cancelled`);
          await loadCampaigns();
        } catch (error: unknown) {
          logger.error('Error cancelling campaign:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to cancel campaign');
        }
      }
    });
  };

  const openRescheduleModal = (campaign: CampaignRecord) => {
    const currentDate = campaign.startDate || campaign.createdAt;
    const dateObj = new Date(currentDate);
    
    setRescheduleModal({
      isOpen: true,
      campaignId: String(campaign.id),
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
      setIsRescheduling(true);
      // Send ISO string and include user timezone for accurate scheduling
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await campaignsApi.rescheduleCampaign(
        rescheduleModal.campaignId,
        newStartDate.toISOString(),
        userTimezone
      );
      
      toast.success(`Campaign "${rescheduleModal.campaignName}" rescheduled to ${newStartDate.toLocaleString()}`);
      
      closeRescheduleModal();
      await loadCampaigns();
    } catch (error: unknown) {
      logger.error('Error rescheduling campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reschedule campaign');
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <CampaignsSubNav />

      {isLoading && scheduledCampaigns.length === 0 && (
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
          </div>
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaign Schedule</h1>
          <p className="text-muted-foreground mt-2">
            Manage scheduled and recurring campaigns
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => { loadCampaigns(); }} disabled={isLoading} variant="outline" size="sm">
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Campaigns</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">Ready to send</p>
          </CardContent>
        </Card>
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecipients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all scheduled</p>
          </CardContent>
        </Card>
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recurring Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recurring}</div>
            <p className="text-xs text-muted-foreground">Active schedules</p>
          </CardContent>
        </Card>
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Campaign</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.nextCampaign || 'None'}</div>
            <p className="text-xs text-muted-foreground">{stats.nextCampaign ? 'Next scheduled send' : 'No upcoming'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Global empty state when nothing exists */}
      {!isLoading && scheduledCampaigns.length === 0 && recurringCampaigns.length === 0 && sentCampaigns.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Campaigns Scheduled</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You don't have any scheduled, recurring, or recently sent campaigns yet. Create your first campaign to get started.
            </p>
            <Button onClick={() => navigate('/campaigns/create')}>
              <Calendar className="h-4 w-4 mr-2" />
              Create & Schedule Campaign
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Campaigns */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle>Upcoming Scheduled Campaigns</CardTitle>
          <CardDescription>Campaigns ready to send at scheduled times</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scheduledCampaigns.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No upcoming scheduled campaigns</p>
            )}
            {scheduledCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:shadow-lg hover:border-primary/30 transition-all duration-200"
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
                      <span>{(campaign.recipients || 0).toLocaleString()} recipients</span>
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
                    disabled={isRescheduling}
                  >
                    Reschedule
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSendNow(String(campaign.id), campaign.name)}
                    disabled={isLoading}
                  >
                    Send Now
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleCancelCampaign(String(campaign.id), campaign.name)}
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
      <Card className="premium-card">
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
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-lg hover:border-primary/30 transition-all duration-200"
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
                        <Badge variant={schedule.status === 'ACTIVE' ? 'default' : 'outline'}>{schedule.status}</Badge>
                        {schedule.frequency && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{schedule.frequency as string}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{Number(schedule.recipients || schedule.audience || 0)} recipients</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Next send: {schedule.nextSendAt
                          ? new Date(schedule.nextSendAt as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : schedule.startDate
                            ? new Date(schedule.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Not scheduled'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setRescheduleModal({ isOpen: true, campaignId: String(schedule.id), campaignName: schedule.name, currentDate: schedule.scheduledDate || schedule.startDate || '' });
                    }}>
                      Edit Schedule
                    </Button>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      try {
                        await campaignsApi.pauseCampaign(String(schedule.id));
                        toast.success('Campaign paused successfully');
                        loadCampaigns();
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : 'Failed to pause campaign');
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
      <Card className="premium-card">
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
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-lg hover:border-primary/30 transition-all duration-200"
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
                        <span>{(campaign.recipients || 0).toLocaleString()} sent</span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                        <span>
                          Opened: {campaign.opened || 0} (
                          {formatRate(calcRate(campaign.opened || 0, campaign.recipients || 0))}%)
                        </span>
                        <span>
                          Clicked: {campaign.clicked || 0} (
                          {formatRate(calcRate(campaign.clicked || 0, campaign.recipients || 0))}%)
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
            {sentCampaigns.length >= 5 && (
              <div className="text-center pt-2">
                <Button variant="link" size="sm" onClick={() => navigate('/campaigns')}>
                  View all campaigns →
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schedule New Campaign */}
      <Card className="premium-card">
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
      <Dialog open={rescheduleModal.isOpen} onOpenChange={(open) => { if (!open) closeRescheduleModal() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Campaign</DialogTitle>
          </DialogHeader>
          
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
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">New Time</label>
              <input
                type="time"
                value={newScheduleTime}
                onChange={(e) => setNewScheduleTime(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Times are in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={closeRescheduleModal}
              disabled={isRescheduling}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleReschedule}
              disabled={isRescheduling}
            >
              {isRescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={confirmAction.isOpen} onOpenChange={(open) => { if (!open) setConfirmAction(prev => ({ ...prev, isOpen: false })) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmAction.title}</DialogTitle>
            <DialogDescription>{confirmAction.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
            <Button onClick={confirmAction.onConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignSchedule;
