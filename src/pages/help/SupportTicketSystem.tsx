import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ticket, MessageSquare, AlertCircle, CheckCircle, Clock, Search, Send, ArrowLeft, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { supportApi } from '@/lib/api';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  isStaffReply: boolean;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  createdById: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  messages?: TicketMessage[];
  _count?: { messages: number };
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-primary/10 text-primary',
  IN_PROGRESS: 'bg-warning/10 text-warning',
  RESOLVED: 'bg-success/10 text-success',
  CLOSED: 'bg-muted text-muted-foreground',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-success/10 text-success',
  MEDIUM: 'bg-warning/10 text-warning',
  HIGH: 'bg-destructive/10 text-destructive',
  URGENT: 'bg-destructive/20 text-destructive',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

const CATEGORIES = [
  'Campaigns',
  'Lead Management',
  'Integrations',
  'Billing',
  'Technical Support',
  'Feature Request',
  'Other',
];

const SupportTicketSystem = () => {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: '', category: '', search: '' });
  const [page, setPage] = useState(1);

  // Form state
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', category: '', priority: 'MEDIUM' });
  const [replyContent, setReplyContent] = useState('');

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: ticketData, isLoading, isError, refetch } = useQuery({
    queryKey: ['support-tickets', filters, page],
    queryFn: () => supportApi.list({
      ...(filters.status && { status: filters.status }),
      ...(filters.category && { category: filters.category }),
      ...(filters.search && { search: filters.search }),
      page,
      limit: 20,
    }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['support-ticket-stats'],
    queryFn: () => supportApi.getStats(),
  });

  const { data: ticketDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['support-ticket', selectedTicketId],
    queryFn: () => supportApi.get(selectedTicketId!),
    enabled: !!selectedTicketId && view === 'detail',
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: typeof newTicket) => supportApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket-stats'] });
      setNewTicket({ subject: '', description: '', category: '', priority: 'MEDIUM' });
      setView('list');
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ ticketId, content }: { ticketId: string; content: string }) =>
      supportApi.addMessage(ticketId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setReplyContent('');
    },
  });

  const tickets: SupportTicket[] = ticketData?.data?.tickets ?? [];
  const pagination = ticketData?.data?.pagination;
  const stats = statsData?.data;
  const detail: SupportTicket | null = ticketDetail?.data ?? null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const openTicket = (id: string) => {
    setSelectedTicketId(id);
    setView('detail');
  };

  // ── Detail view ──────────────────────────────────────────────────────────
  if (view === 'detail' && detailLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-7 bg-muted animate-pulse rounded w-64" />
            <div className="flex gap-2">
              <div className="h-5 w-20 bg-muted animate-pulse rounded-full" />
              <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
            </div>
          </div>
        </div>
        <Card><CardContent className="pt-6"><div className="space-y-3"><div className="h-4 bg-muted animate-pulse rounded w-full" /><div className="h-4 bg-muted animate-pulse rounded w-3/4" /><div className="h-4 bg-muted animate-pulse rounded w-1/2" /></div></CardContent></Card>
      </div>
    );
  }

  if (view === 'detail' && detail) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => { setView('list'); setSelectedTicketId(null); }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{detail.subject}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className={STATUS_COLORS[detail.status] || ''}>
                {STATUS_LABELS[detail.status] || detail.status}
              </Badge>
              <Badge variant="secondary" className={PRIORITY_COLORS[detail.priority] || ''}>
                {PRIORITY_LABELS[detail.priority] || detail.priority}
              </Badge>
              {detail.category && (
                <Badge variant="outline">{detail.category}</Badge>
              )}
              <span className="text-sm text-muted-foreground">Created {formatDate(detail.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Original description */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Original Description</p>
            <p className="whitespace-pre-wrap">{detail.description}</p>
          </CardContent>
        </Card>

        {/* Messages thread */}
        <div className="space-y-3">
          {(detail.messages || []).map((msg) => (
            <Card key={msg.id} className={msg.isStaffReply ? 'border-primary/20 bg-primary/5' : ''}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {msg.isStaffReply ? '\u{1F6E1}\uFE0F Support Staff' : 'You'}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(msg.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reply form */}
        {detail.status !== 'CLOSED' && (
          <Card>
            <CardContent className="pt-6">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your reply..."
                rows={4}
                className="w-full px-3 py-2 border rounded-lg mb-3 transition-colors"
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    if (replyContent.trim() && selectedTicketId) {
                      replyMutation.mutate({ ticketId: selectedTicketId, content: replyContent.trim() });
                    }
                  }}
                  disabled={!replyContent.trim() || replyMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── Create ticket view ───────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setView('list')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
          <h1 className="text-2xl font-bold">Create New Support Ticket</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Describe Your Issue</CardTitle>
            <CardDescription>Our support team will respond as soon as possible</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (newTicket.subject.trim() && newTicket.description.trim()) {
                  createMutation.mutate(newTicket);
                }
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="ticket-category" className="text-sm font-medium">Category</label>
                  <select
                    id="ticket-category"
                    className="w-full px-3 py-2 border rounded-lg transition-colors"
                    value={newTicket.category}
                    onChange={(e) => setNewTicket(s => ({ ...s, category: e.target.value }))}
                  >
                    <option value="">Select category...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="ticket-priority" className="text-sm font-medium">Priority</label>
                  <select
                    id="ticket-priority"
                    className="w-full px-3 py-2 border rounded-lg transition-colors"
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket(s => ({ ...s, priority: e.target.value }))}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="ticket-subject" className="text-sm font-medium">Subject</label>
                <input
                  id="ticket-subject"
                  type="text"
                  placeholder="Brief description of your issue"
                  className="w-full px-3 py-2 border rounded-lg transition-colors"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(s => ({ ...s, subject: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="ticket-description" className="text-sm font-medium">Description</label>
                <textarea
                  id="ticket-description"
                  placeholder="Provide detailed information about your issue..."
                  rows={6}
                  className="w-full px-3 py-2 border rounded-lg transition-colors"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket(s => ({ ...s, description: e.target.value }))}
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setView('list')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Submitting...' : 'Submit Ticket'}
                </Button>
              </div>
              {createMutation.isError && (
                <p className="text-sm text-destructive">Failed to create ticket. Please try again.</p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── List view (default) ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your support requests
          </p>
        </div>
        <Button onClick={() => setView('create')}>
          <Plus className="h-4 w-4 mr-2" />
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
                className="w-full pl-10 pr-4 py-2 border rounded-lg transition-colors"
                value={filters.search}
                onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
              />
            </div>
            <select
              className="px-4 py-2 border rounded-lg transition-colors"
              value={filters.status}
              onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
            >
              <option value="">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            <select
              className="px-4 py-2 border rounded-lg transition-colors"
              value={filters.category}
              onChange={(e) => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1); }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <Ticket className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.open ?? '\u2014'}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.inProgress ?? '\u2014'}</div>
            <p className="text-xs text-muted-foreground">Being worked on</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.resolved ?? '\u2014'}</div>
            <p className="text-xs text-muted-foreground">Resolved tickets</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.closed ?? '\u2014'}</div>
            <p className="text-xs text-muted-foreground">Closed tickets</p>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      {isError ? (
        <ErrorBanner message="Failed to load support tickets" retry={refetch} />
      ) : isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-5 bg-muted rounded w-48" />
                      <div className="h-5 bg-muted rounded w-16" />
                      <div className="h-5 bg-muted rounded w-16" />
                    </div>
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-1">No tickets found</h3>
            <p className="text-muted-foreground mb-4">
              {filters.status || filters.category || filters.search
                ? 'Try adjusting your filters.'
                : "You haven't created any support tickets yet."}
            </p>
            {!filters.status && !filters.category && !filters.search && (
              <Button onClick={() => setView('create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Ticket
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => openTicket(ticket.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTicket(ticket.id) } }}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                      <Badge variant="secondary" className={STATUS_COLORS[ticket.status] || ''}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </Badge>
                      <Badge variant="secondary" className={PRIORITY_COLORS[ticket.priority] || ''}>
                        {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{ticket.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      {ticket.category && (
                        <>
                          <span>{ticket.category}</span>
                          <span>&middot;</span>
                        </>
                      )}
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{ticket._count?.messages ?? 0} replies</span>
                      </div>
                      <span>&middot;</span>
                      <span>Created {formatDate(ticket.createdAt)}</span>
                      <span>&middot;</span>
                      <span>Updated {formatDate(ticket.updatedAt)}</span>
                    </div>
                  </div>
                  <Button variant="outline" onClick={(e) => { e.stopPropagation(); openTicket(ticket.id); }}>
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Contact Support */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-semibold text-foreground">Need Immediate Assistance?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Our support team is available during business hours. For urgent issues, please create a ticket with <strong>Urgent</strong> priority and we&apos;ll prioritize it.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportTicketSystem;
