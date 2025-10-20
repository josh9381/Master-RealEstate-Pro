import { Phone, PhoneCall, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const PhoneCampaigns = () => {
  const campaigns = [
    {
      id: 1,
      name: 'Q1 Sales Outreach',
      type: 'Automated',
      status: 'active',
      totalCalls: 450,
      answered: 320,
      voicemail: 95,
      conversions: 45,
      avgDuration: '8m 32s',
    },
    {
      id: 2,
      name: 'Customer Satisfaction Survey',
      type: 'IVR',
      status: 'completed',
      totalCalls: 850,
      answered: 680,
      voicemail: 120,
      conversions: 510,
      avgDuration: '3m 15s',
    },
    {
      id: 3,
      name: 'Appointment Confirmations',
      type: 'Reminder',
      status: 'scheduled',
      totalCalls: 200,
      scheduled: '2024-01-20',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Phone Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            Manage automated calling campaigns and track performance
          </p>
        </div>
        <Button>
          <Phone className="h-4 w-4 mr-2" />
          Create Phone Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,500</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Answer Rate</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">66.7%</div>
            <p className="text-xs text-muted-foreground">1,000 answered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6m 24s</div>
            <p className="text-xs text-muted-foreground">Per call</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">37.0%</div>
            <p className="text-xs text-muted-foreground">555 conversions</p>
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
            <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer">
              <Phone className="h-8 w-8 mb-3 text-primary" />
              <h4 className="font-semibold mb-2">Automated Calls</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Pre-recorded messages delivered automatically
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Create
              </Button>
            </div>
            <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer">
              <PhoneCall className="h-8 w-8 mb-3 text-primary" />
              <h4 className="font-semibold mb-2">IVR Campaigns</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Interactive voice response with menu options
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Create
              </Button>
            </div>
            <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer">
              <Clock className="h-8 w-8 mb-3 text-primary" />
              <h4 className="font-semibold mb-2">Reminder Calls</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Appointment and event reminders
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Create
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
                          campaign.status === 'active'
                            ? 'success'
                            : campaign.status === 'completed'
                            ? 'secondary'
                            : 'warning'
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                      {campaign.status !== 'scheduled' ? (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Calls</p>
                            <p className="font-medium">{campaign.totalCalls}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Answered</p>
                            <p className="font-medium">{campaign.answered}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Voicemail</p>
                            <p className="font-medium">{campaign.voicemail}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Duration</p>
                            <p className="font-medium">{campaign.avgDuration}</p>
                          </div>
                        </>
                      ) : (
                        <div>
                          <p className="text-xs text-muted-foreground">Scheduled For</p>
                          <p className="font-medium">{campaign.scheduled}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm">
                    View Report
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

export default PhoneCampaigns;
