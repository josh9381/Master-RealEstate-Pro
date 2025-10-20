import { Phone, PhoneIncoming, PhoneOutgoing, Clock, Mic, PhoneMissed } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

const CallCenter = () => {
  const recentCalls = [
    {
      id: 1,
      contact: 'John Smith',
      phone: '+1 (555) 123-4567',
      type: 'inbound',
      duration: '12m 34s',
      status: 'completed',
      time: '5 minutes ago',
      notes: 'Discussed pricing and features',
    },
    {
      id: 2,
      contact: 'Sarah Johnson',
      phone: '+1 (555) 234-5678',
      type: 'outbound',
      duration: '8m 12s',
      status: 'completed',
      time: '1 hour ago',
      notes: 'Follow-up call - interested in demo',
    },
    {
      id: 3,
      contact: 'Mike Wilson',
      phone: '+1 (555) 345-6789',
      type: 'missed',
      duration: '0m 0s',
      status: 'missed',
      time: '2 hours ago',
      notes: 'No answer - will call back',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Call Center</h1>
          <p className="text-muted-foreground mt-2">Make and manage phone calls</p>
        </div>
        <Button>
          <Phone className="h-4 w-4 mr-2" />
          Make Call
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Today</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">+15% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">9m 42s</div>
            <p className="text-xs text-muted-foreground">Per call</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Answer Rate</CardTitle>
            <PhoneIncoming className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">83.2%</div>
            <p className="text-xs text-muted-foreground">39 answered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missed Calls</CardTitle>
            <PhoneMissed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Need follow-up</p>
          </CardContent>
        </Card>
      </div>

      {/* Dialer */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Dial</CardTitle>
          <CardDescription>Enter a phone number or search contacts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Enter phone number or contact name..." />
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((num) => (
              <Button key={num} variant="outline" size="lg" className="text-lg">
                {num}
              </Button>
            ))}
          </div>
          <div className="flex space-x-2">
            <Button className="flex-1">
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
            <Button variant="outline" className="flex-1">
              <Mic className="h-4 w-4 mr-2" />
              Voicemail
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Call History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Call History</CardTitle>
              <CardDescription>Recent calls and conversations</CardDescription>
            </div>
            <Input placeholder="Search calls..." className="w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent"
              >
                <div className="flex items-start space-x-4 flex-1">
                  <div
                    className={`p-2 rounded-lg ${
                      call.type === 'inbound'
                        ? 'bg-blue-100'
                        : call.type === 'outbound'
                        ? 'bg-green-100'
                        : 'bg-red-100'
                    }`}
                  >
                    {call.type === 'inbound' && (
                      <PhoneIncoming
                        className={`h-5 w-5 ${
                          call.type === 'inbound' ? 'text-blue-600' : ''
                        }`}
                      />
                    )}
                    {call.type === 'outbound' && (
                      <PhoneOutgoing className="h-5 w-5 text-green-600" />
                    )}
                    {call.type === 'missed' && <PhoneMissed className="h-5 w-5 text-red-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{call.contact}</h4>
                      <Badge
                        variant={
                          call.status === 'completed'
                            ? 'success'
                            : call.status === 'missed'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {call.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {call.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{call.phone}</p>
                    <div className="flex items-center space-x-4 text-sm mb-2">
                      <span className="text-muted-foreground">Duration: {call.duration}</span>
                      <span className="text-muted-foreground">{call.time}</span>
                    </div>
                    <p className="text-sm">{call.notes}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common calling features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col">
              <PhoneIncoming className="h-6 w-6 mb-2" />
              <span>Answer Queue</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <PhoneMissed className="h-6 w-6 mb-2" />
              <span>Missed Calls</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Mic className="h-6 w-6 mb-2" />
              <span>Voicemails</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Clock className="h-6 w-6 mb-2" />
              <span>Scheduled</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CallCenter;
