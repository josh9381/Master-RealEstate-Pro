import { Phone, PhoneCall, Clock, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { CampaignsSubNav } from '@/components/campaigns/CampaignsSubNav';

const PhoneCampaigns = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    answerRate: 0,
    avgDuration: '0m 0s',
    conversions: 0
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadCampaigns();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const response = await campaignsApi.getCampaigns({ type: 'PHONE', limit: 50 });
      const phoneCampaigns = response.data?.campaigns || response.campaigns || [];
      
      setCampaigns(phoneCampaigns);
      // Compute real stats from campaign data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalCalls = phoneCampaigns.reduce((sum: number, c: any) => sum + (c.sent || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalAnswered = phoneCampaigns.reduce((sum: number, c: any) => sum + (c.opened || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalConversions = phoneCampaigns.reduce((sum: number, c: any) => sum + (c.converted || 0), 0);
      setStats({
        total: response.data?.pagination?.total || phoneCampaigns.length,
        answerRate: totalCalls > 0 ? parseFloat(((totalAnswered / totalCalls) * 100).toFixed(1)) : 0,
        avgDuration: totalCalls > 0 ? 'N/A' : 'N/A', // Voice integration coming soon
        conversions: totalConversions
      });
    } catch (error) {
      console.error('Error loading phone campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <CampaignsSubNav />

      {/* Coming Soon Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-amber-800">Coming Soon — Voice Telephony</h3>
          <p className="text-sm text-amber-700 mt-1">
            Phone campaigns require voice telephony integration which is not yet available. 
            This feature is on the roadmap. In the meantime, use Email or SMS campaigns to reach your leads.
          </p>
        </div>
        <Badge variant="warning" className="shrink-0">Coming Soon</Badge>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Phone Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            Manage automated calling campaigns and track performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCampaigns} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button disabled title="Voice telephony integration coming soon">
            <Phone className="h-4 w-4 mr-2" />
            Create Phone Campaign
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Phone campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Answer Rate</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.answerRate}%</div>
            <p className="text-xs text-muted-foreground">{stats.total > 0 ? 'From your campaigns' : 'Voice integration pending'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDuration}</div>
            <p className="text-xs text-muted-foreground">{stats.total > 0 ? 'Per call' : 'Voice integration pending'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversions}</div>
            <p className="text-xs text-muted-foreground">Successful calls</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Types */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Types</CardTitle>
          <CardDescription>Choose the type of phone campaign to create</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg opacity-60 cursor-not-allowed">
              <Phone className="h-8 w-8 mb-3 text-muted-foreground" />
              <h4 className="font-semibold mb-2">Automated Calls</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Pre-recorded messages delivered automatically
              </p>
              <Button variant="outline" size="sm" className="w-full" disabled>
                Coming Soon
              </Button>
            </div>
            <div className="p-4 border rounded-lg opacity-60 cursor-not-allowed">
              <PhoneCall className="h-8 w-8 mb-3 text-muted-foreground" />
              <h4 className="font-semibold mb-2">IVR Campaigns</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Interactive voice response with menu options
              </p>
              <Button variant="outline" size="sm" className="w-full" disabled>
                Coming Soon
              </Button>
            </div>
            <div className="p-4 border rounded-lg opacity-60 cursor-not-allowed">
              <Clock className="h-8 w-8 mb-3 text-muted-foreground" />
              <h4 className="font-semibold mb-2">Reminder Calls</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Appointment and event reminders
              </p>
              <Button variant="outline" size="sm" className="w-full" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Active Campaigns</CardTitle>
          <CardDescription>Monitor and manage your phone campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-start space-x-4 flex-1">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Phone className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{campaign.name}</h4>
                      <Badge variant="outline">{campaign.type}</Badge>
                      <Badge
                        variant={
                          campaign.status?.toUpperCase() === 'ACTIVE'
                            ? 'success'
                            : campaign.status?.toUpperCase() === 'COMPLETED'
                            ? 'secondary'
                            : 'warning'
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                      {campaign.status?.toUpperCase() !== 'SCHEDULED' ? (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Calls</p>
                            <p className="font-medium">{campaign.sent ?? 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Answered</p>
                            <p className="font-medium">{campaign.opened ?? 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Conversions</p>
                            <p className="font-medium">{campaign.converted ?? 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="font-medium">${campaign.revenue?.toLocaleString() ?? '0'}</p>
                          </div>
                        </>
                      ) : (
                        <div>
                          <p className="text-xs text-muted-foreground">Scheduled For</p>
                          <p className="font-medium">{campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'TBD'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                    View Report
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

export default PhoneCampaigns;
