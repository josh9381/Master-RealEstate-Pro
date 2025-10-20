import { useState } from 'react';
import { Mail, Send, Calendar, Users, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

const EmailCampaigns = () => {
  const [activeTab, setActiveTab] = useState('all');

  const campaigns = [
    {
      id: 1,
      name: 'Spring Product Launch',
      subject: 'Introducing Our Latest Innovation',
      status: 'sent',
      sent: 8450,
      opened: 2704,
      clicked: 676,
      date: '2024-01-15',
    },
    {
      id: 2,
      name: 'Weekly Newsletter #45',
      subject: 'This Week in Marketing',
      status: 'scheduled',
      recipients: 5230,
      date: '2024-01-20',
    },
    {
      id: 3,
      name: 'Customer Re-engagement',
      subject: 'We Miss You! Special Offer Inside',
      status: 'draft',
      recipients: 3200,
      date: '2024-01-18',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-muted-foreground mt-2">Create and manage email marketing campaigns</p>
        </div>
        <Button>
          <Send className="h-4 w-4 mr-2" />
          Create Email Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23,660</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32.0%</div>
            <p className="text-xs text-muted-foreground">+2.5% vs last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Click Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.0%</div>
            <p className="text-xs text-muted-foreground">+1.2% vs last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Coming soon</p>
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
            <Input placeholder="Search campaigns..." className="w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaigns.map((campaign) => (
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
                    <p className="text-sm text-muted-foreground mb-2">{campaign.subject}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Date: {campaign.date}</span>
                      {campaign.status === 'sent' && (
                        <>
                          <span>Sent: {campaign.sent}</span>
                          <span>Opened: {campaign.opened}</span>
                          <span>Clicked: {campaign.clicked}</span>
                        </>
                      )}
                      {campaign.status !== 'sent' && <span>Recipients: {campaign.recipients}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm">
                    View
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

export default EmailCampaigns;
