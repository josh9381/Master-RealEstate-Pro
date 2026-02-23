import { useState, useEffect } from 'react'
import { Smartphone, Send, Users, Clock, MessageSquare, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast'
import { messagesApi } from '@/lib/api'

const SMSCenter = () => {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sending, setSending] = useState(false)
  const { toast } = useToast()
  const [recentMessages, setRecentMessages] = useState<Array<{ id: number; contact: string; phone: string; message: string; time: string; status: string; direction: string }>>([])
  
  // Quick Send form state
  const [smsRecipient, setSmsRecipient] = useState('')
  const [smsMessage, setSmsMessage] = useState('')
  const [smsSearch, setSmsSearch] = useState('')

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async (showRefreshState = false) => {
    try {
      if (showRefreshState) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await messagesApi.getMessages({ type: 'SMS' })
      
      if (response && Array.isArray(response)) {
        setRecentMessages(response)
      }
    } catch (error) {
      console.error('Failed to load SMS messages:', error)
      toast.error('Failed to load messages, using sample data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadMessages(true)
  }

  const handleSendSMS = async () => {
    if (!smsRecipient.trim()) {
      toast.error('Please enter a recipient phone number')
      return
    }
    if (!smsMessage.trim()) {
      toast.error('Please enter a message')
      return
    }
    setSending(true)
    try {
      await messagesApi.sendSMS({
        to: smsRecipient.trim(),
        message: smsMessage.trim(),
      })
      toast.success('SMS sent successfully!')
      setSmsRecipient('')
      setSmsMessage('')
      // Refresh messages list to show the new message
      loadMessages(true)
    } catch (error: any) {
      console.error('Failed to send SMS:', error)
      toast.error(error?.response?.data?.message || 'Failed to send SMS')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SMS Center</h1>
          <p className="text-muted-foreground mt-2">Send and manage SMS messages</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => {
            setSmsRecipient('');
            setSmsMessage('');
            toast.info('Fill in the Quick Send form below');
            // Scroll to quick send section
            document.querySelector('[data-quick-send]')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            <Send className="h-4 w-4 mr-2" />
            New SMS
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading SMS messages...</p>
          </div>
        </Card>
      ) : (
        <>
      <div className="hidden">Wrapper for loading state</div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No data yet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">No data yet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">No data yet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">No data yet</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Send */}
      <Card data-quick-send>
        <CardHeader>
          <CardTitle>Quick Send</CardTitle>
          <CardDescription>Send an SMS to contacts or phone numbers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Recipients</label>
            <Input
              placeholder="Enter phone number (e.g., +1234567890)"
              value={smsRecipient}
              onChange={(e) => setSmsRecipient(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Message</label>
            <textarea
              className="w-full min-h-[120px] p-3 border rounded-md"
              placeholder="Type your message..."
              maxLength={160}
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-muted-foreground">{smsMessage.length} / 160 characters • {Math.ceil(Math.max(smsMessage.length, 1) / 160)} SMS</p>
              <div className="space-x-2">
                <Button
                  size="sm"
                  onClick={handleSendSMS}
                  disabled={sending || !smsRecipient.trim() || !smsMessage.trim()}
                >
                  {sending ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Sending...</>
                  ) : (
                    <>Send Now</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Messages</CardTitle>
              <CardDescription>Your latest SMS conversations</CardDescription>
            </div>
            <Input
              placeholder="Search messages..."
              className="w-64"
              value={smsSearch}
              onChange={(e) => setSmsSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentMessages
              .filter((msg) => {
                if (!smsSearch.trim()) return true;
                const q = smsSearch.toLowerCase();
                return msg.contact.toLowerCase().includes(q) ||
                       msg.phone.toLowerCase().includes(q) ||
                       msg.message.toLowerCase().includes(q);
              })
              .map((msg) => (
              <div
                key={msg.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent"
              >
                <div className="flex items-start space-x-4 flex-1">
                  <div
                    className={`p-2 rounded-lg ${
                      msg.direction === 'inbound' ? 'bg-blue-100' : 'bg-green-100'
                    }`}
                  >
                    <Smartphone
                      className={`h-5 w-5 ${
                        msg.direction === 'inbound' ? 'text-blue-600' : 'text-green-600'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{msg.contact}</h4>
                      <Badge
                        variant={msg.status === 'delivered' ? 'success' : 'secondary'}
                        className="text-xs"
                      >
                        {msg.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {msg.direction}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{msg.phone}</p>
                    <p className="text-sm mb-2">{msg.message}</p>
                    <p className="text-xs text-muted-foreground">{msg.time}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setSmsRecipient(msg.phone);
                  setSmsMessage('');
                  document.querySelector('[data-quick-send]')?.scrollIntoView({ behavior: 'smooth' });
                  toast.info(`Replying to ${msg.contact}`);
                }}>
                  Reply
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SMS Templates */}
      <Card>
        <CardHeader>
          <CardTitle>SMS Templates</CardTitle>
          <CardDescription>Quick access to commonly used messages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
              <h4 className="font-medium mb-1">Appointment Reminder</h4>
              <p className="text-sm text-muted-foreground">
                Hi! Reminder: You have an appointment tomorrow at [TIME]. Reply YES to confirm.
              </p>
            </div>
            <div className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
              <h4 className="font-medium mb-1">Follow-up Message</h4>
              <p className="text-sm text-muted-foreground">
                Thanks for your interest! Do you have any questions I can help with?
              </p>
            </div>
            <div className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
              <h4 className="font-medium mb-1">Special Offer</h4>
              <p className="text-sm text-muted-foreground">
                Limited time offer! Get [X]% off when you [ACTION]. Use code: [CODE]
              </p>
            </div>
            <div className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
              <h4 className="font-medium mb-1">Thank You</h4>
              <p className="text-sm text-muted-foreground">
                Thank you for choosing us! We appreciate your business.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
};

export default SMSCenter;
