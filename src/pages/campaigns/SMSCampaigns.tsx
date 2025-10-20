import { MessageSquare, Send, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

const SMSCampaigns = () => {
  const smsCampaigns = [
    {
      id: 1,
      name: 'Flash Sale Alert',
      message: '🎉 FLASH SALE! 50% off for the next 2 hours. Use code FLASH50',
      status: 'sent',
      sent: 3200,
      delivered: 3180,
      clicked: 512,
      date: '2024-01-15',
    },
    {
      id: 2,
      name: 'Appointment Reminder',
      message: 'Hi! Reminder: You have an appointment tomorrow at 2 PM. Reply YES to confirm.',
      status: 'scheduled',
      recipients: 450,
      date: '2024-01-20',
    },
    {
      id: 3,
      name: 'Product Launch',
      message: 'Be the first to know! New product launching this Friday. Stay tuned!',
      status: 'draft',
      recipients: 5000,
      date: '2024-01-22',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SMS Campaigns</h1>
          <p className="text-muted-foreground mt-2">Send targeted SMS messages to your contacts</p>
        </div>
        <Button>
          <MessageSquare className="h-4 w-4 mr-2" />
          Create SMS Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,200</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.4%</div>
            <p className="text-xs text-muted-foreground">3,180 delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">16.0%</div>
            <p className="text-xs text-muted-foreground">512 clicks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
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
