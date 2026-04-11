import { logger } from '@/lib/logger'
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Mail, MessageSquare, TrendingUp, Users, Calendar, RefreshCw, Volume2, VolumeX, Play } from 'lucide-react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { settingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { getSoundSettings, saveSoundSettings, playPreviewSound, type SoundSettings } from '@/lib/notificationSounds';

import { LucideIcon } from 'lucide-react';

interface NotificationSetting {
  id: string;
  label: string;
  email: boolean;
  push: boolean;
  sms: boolean;
}

interface NotificationCategory {
  icon: LucideIcon;
  title: string;
  description: string;
  settings: NotificationSetting[];
}

const NotificationSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  // Sound settings (per-user, localStorage)
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(() => getSoundSettings(userId));

  // Persist sound settings whenever they change
  const updateSoundSettings = (update: Partial<SoundSettings>) => {
    setSoundSettings((prev) => {
      const next = { ...prev, ...update };
      saveSoundSettings(userId, next);
      return next;
    });
  };

  const toggleSoundEvent = (eventId: string) => {
    setSoundSettings((prev) => {
      const next = { ...prev, events: { ...prev.events, [eventId]: !prev.events[eventId] } };
      saveSoundSettings(userId, next);
      return next;
    });
  };

  // Channel toggles
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  
  // Quiet hours
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');

  const [notificationCategories, setNotificationCategories] = useState<NotificationCategory[]>([
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
  ]);

  const { data: notificationData, isLoading: loading, isFetching: refreshing, refetch } = useQuery({
    queryKey: ['settings', 'notifications'],
    queryFn: async () => {
      const response = await settingsApi.getNotificationSettings();
      return response;
    },
  });

  // Sync fetched data into form state
  useEffect(() => {
    if (notificationData) {
      setEmailEnabled(notificationData.emailEnabled ?? true);
      setPushEnabled(notificationData.pushEnabled ?? true);
      setSmsEnabled(notificationData.smsEnabled ?? true);
      setQuietHoursEnabled(notificationData.quietHoursEnabled ?? false);
      setQuietStart(notificationData.quietStart || '22:00');
      setQuietEnd(notificationData.quietEnd || '08:00');
      if (notificationData.categories) {
        setNotificationCategories(notificationData.categories);
      }
    }
  }, [notificationData]);

  const handleRefresh = () => {
    refetch();
  };

  const handleToggleNotification = (categoryIndex: number, settingIndex: number, channel: 'email' | 'push' | 'sms') => {
    setNotificationCategories(prev => {
      const updated = [...prev];
      updated[categoryIndex].settings[settingIndex][channel] = !updated[categoryIndex].settings[settingIndex][channel];
      return updated;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: { emailEnabled: boolean; pushEnabled: boolean; smsEnabled: boolean; quietHoursEnabled: boolean; quietStart: string; quietEnd: string; categories: NotificationCategory[] }) => {
      return await settingsApi.updateNotificationSettings(data);
    },
    onSuccess: () => {
      toast.success('Notification preferences saved successfully');
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] });
    },
    onError: (error) => {
      logger.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences');
    },
  });

  const handleSave = () => {
    if (quietHoursEnabled && quietStart === quietEnd) {
      toast.error('Quiet hours start and end times cannot be the same');
      return;
    }
    saveMutation.mutate({
      emailEnabled,
      pushEnabled,
      smsEnabled,
      quietHoursEnabled,
      quietStart,
      quietEnd,
      categories: notificationCategories,
    });
  };

  if (loading) {
    return <LoadingSkeleton rows={3} />;
  }

  const handleReset = () => {
    // Reset to default values
    setEmailEnabled(true);
    setPushEnabled(true);
    setSmsEnabled(true);
    setQuietHoursEnabled(false);
    setQuietStart('22:00');
    setQuietEnd('08:00');
    
    // Re-sync categories from API data if available, otherwise use initial defaults
    if (notificationData?.categories) {
      setNotificationCategories(notificationData.categories);
    } else {
      // Reset all notification settings to defaults
      setNotificationCategories([
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
      ]);
    }
    
    toast.success('Reset to default preferences');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notification Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage how and when you receive notifications
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Email</h4>
                  <p className="text-sm text-muted-foreground">{user?.email || 'Not set'}</p>
                </div>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="rounded" 
                />
                <span className="text-sm">Enable email notifications</span>
              </label>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Bell className="h-5 w-5 text-success" />
                </div>
                <div>
                  <h4 className="font-semibold">Push</h4>
                  <p className="text-sm text-muted-foreground">Browser & Mobile</p>
                </div>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={pushEnabled}
                  onChange={(e) => setPushEnabled(e.target.checked)}
                  className="rounded" 
                />
                <span className="text-sm">Enable push notifications</span>
              </label>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">SMS</h4>
                  <p className="text-sm text-muted-foreground">Via your phone number</p>
                </div>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={smsEnabled}
                  onChange={(e) => setSmsEnabled(e.target.checked)}
                  className="rounded" 
                />
                <span className="text-sm">Enable SMS notifications</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      {notificationCategories.map((category, categoryIndex) => {
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
                {category.settings.map((setting, settingIndex) => (
                  <div key={setting.id} className="grid grid-cols-4 gap-4 items-center">
                    <div className="col-span-1 text-sm">{setting.label}</div>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={setting.email}
                        onChange={() => handleToggleNotification(categoryIndex, settingIndex, 'email')}
                        className="rounded"
                      />
                    </div>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={setting.push}
                        onChange={() => handleToggleNotification(categoryIndex, settingIndex, 'push')}
                        className="rounded"
                      />
                    </div>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={setting.sms}
                        onChange={() => handleToggleNotification(categoryIndex, settingIndex, 'sms')}
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

      {/* Notification Sounds */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {soundSettings.enabled ? (
                  <Volume2 className="h-5 w-5 text-primary" />
                ) : (
                  <VolumeX className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle>Notification Sounds</CardTitle>
                <CardDescription>Configure sound alerts for each notification type</CardDescription>
              </div>
            </div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={soundSettings.enabled}
                onChange={(e) => updateSoundSettings({ enabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium">{soundSettings.enabled ? 'On' : 'Off'}</span>
            </label>
          </div>
        </CardHeader>
        {soundSettings.enabled && (
          <CardContent className="space-y-4">
            {/* Volume slider */}
            <div className="flex items-center gap-4">
              <VolumeX className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={soundSettings.volume}
                onChange={(e) => updateSoundSettings({ volume: parseFloat(e.target.value) })}
                className="flex-1 h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
              />
              <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-8">{Math.round(soundSettings.volume * 100)}%</span>
            </div>

            {/* Per-event sound toggles */}
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 pb-2 border-b text-sm font-medium">
                <div>Event</div>
                <div className="text-center w-16">Sound</div>
                <div className="w-10" />
              </div>
              {notificationCategories.flatMap((cat) => cat.settings).map((setting) => (
                <div key={setting.id} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center">
                  <span className="text-sm">{setting.label}</span>
                  <div className="flex justify-center w-16">
                    <input
                      type="checkbox"
                      checked={soundSettings.events[setting.id] ?? true}
                      onChange={() => toggleSoundEvent(setting.id)}
                      className="rounded"
                    />
                  </div>
                  <button
                    onClick={() => playPreviewSound(setting.id, soundSettings.volume)}
                    className="p-1 rounded hover:bg-accent transition-colors w-10 flex justify-center"
                    title="Preview sound"
                  >
                    <Play className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
          <CardDescription>Set times when you do not want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={quietHoursEnabled}
              onChange={(e) => setQuietHoursEnabled(e.target.checked)}
              className="rounded" 
            />
            <span className="text-sm font-medium">Enable quiet hours</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Time</label>
              <input 
                type="time" 
                className="w-full p-2 border rounded-md" 
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                disabled={!quietHoursEnabled}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Time</label>
              <input 
                type="time" 
                className="w-full p-2 border rounded-md" 
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                disabled={!quietHoursEnabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleReset}>Reset to Default</Button>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings;
