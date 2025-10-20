import { Ticket, MessageSquare, AlertCircle, CheckCircle, Clock, User, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const SupportTicketSystem = () => {
  const tickets = [
    {
      id: 'TICK-001',
      subject: 'Cannot send email campaign',
      description: 'Getting error when trying to send campaign to my contact list',
      status: 'Open',
      priority: 'High',
      category: 'Campaigns',
      created: '2 hours ago',
      updated: '30 minutes ago',
      assignee: 'Sarah Johnson',
      replies: 3,
    },
    {
      id: 'TICK-002',
      subject: 'Lead import not working',
      description: 'CSV file fails to upload, shows validation error',
      status: 'In Progress',
      priority: 'Medium',
      category: 'Lead Management',
      created: '1 day ago',
      updated: '3 hours ago',
      assignee: 'Mike Chen',
      replies: 5,
    },
    {
      id: 'TICK-003',
      subject: 'API integration question',
      description: 'Need help connecting Salesforce integration',
      status: 'Waiting for Customer',
      priority: 'Low',
      category: 'Integrations',
      created: '3 days ago',
      updated: '1 day ago',
      assignee: 'Alex Rodriguez',
      replies: 2,
    },
    {
      id: 'TICK-004',
      subject: 'Billing inquiry',
      description: 'Questions about my last invoice charges',
      status: 'Resolved',
      priority: 'Medium',
      category: 'Billing',
      created: '5 days ago',
      updated: '4 days ago',
      assignee: 'Emma Wilson',
      replies: 4,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-100 text-blue-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Waiting for Customer':
        return 'bg-purple-100 text-purple-800';
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      case 'Closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-orange-100 text-orange-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your support requests
          </p>
        </div>
        <Button>
          <Ticket className="h-4 w-4 mr-2" />
          Create New Ticket
        </Button>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tickets..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <select className="px-4 py-2 border rounded-lg">
              <option>All Status</option>
              <option>Open</option>
              <option>In Progress</option>
              <option>Waiting for Customer</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>
            <select className="px-4 py-2 border rounded-lg">
              <option>All Categories</option>
              <option>Campaigns</option>
              <option>Lead Management</option>
              <option>Integrations</option>
              <option>Billing</option>
              <option>Technical</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Being worked on</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.5h</div>
            <p className="text-xs text-muted-foreground">Average time</p>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                    <Badge variant="secondary" className={getStatusColor(ticket.status)}>
                      {ticket.status}
                    </Badge>
                    <Badge variant="secondary" className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{ticket.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Ticket className="h-4 w-4" />
                      <span>{ticket.id}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{ticket.assignee}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{ticket.replies} replies</span>
                    </div>
                    <span>•</span>
                    <span>Created {ticket.created}</span>
                    <span>•</span>
                    <span>Updated {ticket.updated}</span>
                  </div>
                </div>
                <Button variant="outline">View Details</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create New Ticket Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Support Ticket</CardTitle>
          <CardDescription>Describe your issue and we'll help you resolve it</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>Select category...</option>
                  <option>Campaigns</option>
                  <option>Lead Management</option>
                  <option>Integrations</option>
                  <option>Billing</option>
                  <option>Technical Support</option>
                  <option>Feature Request</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <input
                type="text"
                placeholder="Brief description of your issue"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                placeholder="Provide detailed information about your issue..."
                rows={6}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Attachments</label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: JPG, PNG, PDF, DOC (Max 10MB)
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline">Cancel</Button>
              <Button>Submit Ticket</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* FAQ Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Common Issues</CardTitle>
          <CardDescription>Quick solutions to frequently reported problems</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              'How to reset my password',
              'Troubleshooting email delivery issues',
              'Understanding campaign analytics',
              'Managing user permissions',
              'Setting up integrations',
              'Billing and subscription FAQs',
            ].map((faq, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <span className="text-sm">{faq}</span>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card className="border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">Need Immediate Assistance?</h4>
              <p className="text-sm text-blue-800 mt-1">
                Our support team is available 24/7. For urgent issues, please call us at{' '}
                <a href="tel:+15551234567" className="font-semibold hover:underline">
                  +1 (555) 123-4567
                </a>{' '}
                or email{' '}
                <a href="mailto:support@company.com" className="font-semibold hover:underline">
                  support@company.com
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportTicketSystem;
