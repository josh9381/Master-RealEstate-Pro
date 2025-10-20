import { Bell, Mail, MessageSquare, TrendingUp, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const NotificationSettings = () => {
  const notificationCategories = [
    {
      icon: Users,
      title: 'Lead Notifications',
      description: 'Get notified about new leads and lead activities',
      settings: [
        { id: 'new-lead', label: 'New lead created', email: true, push: true, sms: false },
        { id: 'lead-updated', label: 'Lead status updated', email: true, push: false, sms: false },
        { id: 'lead-assigned', label: 'Lead assigned to you', email: true, push: true, sms: true },
        { id: 'lead-converted', label: 'Lead converted to customer', email: true, push: true, sms: false },
      ],
    },
    {
      icon: TrendingUp,
      title: 'Campaign Notifications',
      description: 'Stay updated on your campaign performance',
      settings: [
        { id: 'campaign-sent', label: 'Campaign sent successfully', email: true, push: false, sms: false },
        { id: 'campaign-milestone', label: 'Campaign milestone reached', email: true, push: true, sms: false },
        { id: 'campaign-issue', label: 'Campaign issues or errors', email: true, push: true, sms: true },
      ],
    },
    {
      icon: MessageSquare,
      title: 'Communication',
      description: 'Notifications for messages and responses',
      settings: [
        { id: 'new-message', label: 'New message received', email: true, push: true, sms: false },
        { id: 'message-replied', label: 'Someone replied to your message', email: true, push: true, sms: false },
        { id: 'missed-call', label: 'Missed call notification', email: false, push: true, sms: true },
      ],
    },
    {
      icon: Calendar,
      title: 'Reminders & Tasks',
      description: 'Get reminded about important tasks',
      settings: [
        { id: 'task-due', label: 'Task due date approaching', email: true, push: true, sms: false },
        { id: 'followup-reminder', label: 'Follow-up reminder', email: true, push: true, sms: true },
        { id: 'meeting-reminder', label: 'Meeting reminder', email: true, push: true, sms: true },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage how and when you receive notifications
        </p>
      </div>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold">Email</h4>
                  <p className="text-sm text-muted-foreground">john.doe@company.com</p>
                </div>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">Enable email notifications</span>
              </label>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Bell className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold">Push</h4>
                  <p className="text-sm text-muted-foreground">Browser & Mobile</p>
                </div>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">Enable push notifications</span>
              </label>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold">SMS</h4>
                  <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
                </div>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">Enable SMS notifications</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      {notificationCategories.map((category) => {
        const Icon = category.icon;
        return (
          <Card key={category.title}>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 pb-2 border-b text-sm font-medium">
                  <div className="col-span-1">Notification</div>
                  <div className="text-center">Email</div>
                  <div className="text-center">Push</div>
                  <div className="text-center">SMS</div>
                </div>
                {category.settings.map((setting) => (
                  <div key={setting.id} className="grid grid-cols-4 gap-4 items-center">
                    <div className="col-span-1 text-sm">{setting.label}</div>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        defaultChecked={setting.email}
                        className="rounded"
                      />
                    </div>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        defaultChecked={setting.push}
                        className="rounded"
                      />
                    </div>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        defaultChecked={setting.sms}
                        className="rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
          <CardDescription>Set times when you do not want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" className="rounded" />
            <span className="text-sm font-medium">Enable quiet hours</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Time</label>
              <input type="time" className="w-full p-2 border rounded-md" defaultValue="22:00" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Time</label>
              <input type="time" className="w-full p-2 border rounded-md" defaultValue="08:00" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline">Reset to Default</Button>
        <Button>Save Preferences</Button>
      </div>
    </div>
  );
};

export default NotificationSettings;
