import { Calendar, Send, Target, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const CampaignSchedule = () => {
  const scheduledCampaigns = [
    {
      id: 1,
      name: 'Spring Product Launch',
      type: 'Email',
      scheduledDate: '2024-01-25',
      scheduledTime: '09:00 AM',
      recipients: 5230,
      status: 'scheduled',
    },
    {
      id: 2,
      name: 'Weekend Flash Sale',
      type: 'SMS',
      scheduledDate: '2024-01-27',
      scheduledTime: '10:00 AM',
      recipients: 3200,
      status: 'scheduled',
    },
    {
      id: 3,
      name: 'Monthly Newsletter',
      type: 'Email',
      scheduledDate: '2024-02-01',
      scheduledTime: '08:00 AM',
      recipients: 8450,
      status: 'scheduled',
    },
  ];

  const recentSends = [
    {
      id: 1,
      name: 'Customer Survey',
      type: 'Email',
      sentDate: '2024-01-15',
      sentTime: '02:00 PM',
      recipients: 2340,
      opened: 842,
      clicked: 234,
    },
    {
      id: 2,
      name: 'New Feature Announcement',
      type: 'Email',
      sentDate: '2024-01-12',
      sentTime: '10:00 AM',
      recipients: 5230,
      opened: 2103,
      clicked: 567,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Schedule</h1>
          <p className="text-muted-foreground mt-2">
            Manage scheduled and recurring campaigns
          </p>
        </div>
        <Button>
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Campaigns</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">16,880</div>
            <p className="text-xs text-muted-foreground">Across all scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recurring Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Active schedules</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Campaign</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">in 3 days</div>
            <p className="text-xs text-muted-foreground">Jan 25, 9:00 AM</p>
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
            {[
              {
                name: 'Weekly Newsletter',
                frequency: 'Every Monday at 8:00 AM',
                type: 'Email',
                recipients: 8450,
                nextSend: '2024-01-22',
              },
              {
                name: 'Monthly Product Updates',
                frequency: 'First day of month at 9:00 AM',
                type: 'Email',
                recipients: 5230,
                nextSend: '2024-02-01',
              },
              {
                name: 'Daily Promotions',
                frequency: 'Daily at 10:00 AM',
                type: 'SMS',
                recipients: 3200,
                nextSend: '2024-01-23',
              },
            ].map((schedule, index) => (
              <div
                key={index}
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
                      <span>{schedule.frequency}</span>
                      <span>•</span>
                      <span>{schedule.recipients.toLocaleString()} recipients</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Next send: {schedule.nextSend}
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
            ))}
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
            {recentSends.map((campaign) => (
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
            ))}
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
