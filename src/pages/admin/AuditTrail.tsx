import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield, Filter, ChevronDown, ChevronUp, Clock, User, Activity } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { format } from 'date-fns'

interface AuditLogEntry {
  id: string
  userId: string | null
  action: string
  entityType: string
  entityId: string | null
  description: string
  ipAddress: string | null
  userAgent: string | null
  beforeData: Record<string, unknown> | null
  afterData: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

interface AuditLogsResponse {
  data: {
    logs: AuditLogEntry[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-success/10 text-success',
  LOGOUT: 'bg-muted text-foreground',
  LOGIN_FAILED: 'bg-destructive/10 text-destructive',
  PASSWORD_CHANGED: 'bg-warning/10 text-warning',
  CREATED: 'bg-primary/10 text-primary',
  UPDATED: 'bg-purple-100 text-purple-800',
  DELETED: 'bg-destructive/10 text-destructive',
  SETTINGS_CHANGED: 'bg-warning/10 text-warning',
  SUBSCRIPTION_CHANGED: 'bg-indigo-100 text-indigo-800',
  DATA_IMPORTED: 'bg-info/10 text-info',
  DATA_EXPORTED: 'bg-teal-100 text-teal-800',
  BULK_ACTION: 'bg-pink-100 text-pink-800',
  BACKUP_CREATED: 'bg-success/10 text-success',
}

export default function AuditTrail() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: actionsData } = useQuery({
    queryKey: ['audit-actions'],
    queryFn: () => adminApi.getAuditActions(),
  })

  const { data: logsData, isLoading } = useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', page, filters],
    queryFn: () => adminApi.getAuditLogs({
      page,
      limit: 50,
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.startDate ? { startDate: filters.startDate } : {}),
      ...(filters.endDate ? { endDate: filters.endDate } : {}),
    }),
  })

  const logs = logsData?.data?.logs || []
  const totalPages = logsData?.data?.totalPages || 1
  const total = logsData?.data?.total || 0
  const actions: string[] = actionsData?.data || []

  const entityTypes = [...new Set(logs.map(l => l.entityType))].sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Audit Trail
          </h1>
          <p className="text-muted-foreground mt-1">
            {total} total audit log entries
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filters
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1); }}
              className="w-full rounded-lg border-border text-sm transition-colors"
            >
              <option value="">All Actions</option>
              {actions.map(a => (
                <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Entity Type</label>
            <select
              value={filters.entityType}
              onChange={(e) => { setFilters(f => ({ ...f, entityType: e.target.value })); setPage(1); }}
              className="w-full rounded-lg border-border text-sm transition-colors"
            >
              <option value="">All Types</option>
              {entityTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => { setFilters(f => ({ ...f, startDate: e.target.value })); setPage(1); }}
              className="w-full rounded-lg border-border text-sm transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => { setFilters(f => ({ ...f, endDate: e.target.value })); setPage(1); }}
              className="w-full rounded-lg border-border text-sm transition-colors"
            />
          </div>
        </div>
      )}

      {/* Log Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No audit logs found</div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map(log => (
              <div key={log.id} className="hover:bg-muted transition-colors">
                <div
                  className="px-4 py-3 flex items-center gap-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <div className="flex-shrink-0">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-muted text-foreground'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">{log.entityType}</span>
                    </div>
                    <p className="text-sm text-foreground truncate">{log.description}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {log.userId && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.userId.slice(0, 8)}...
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                    </span>
                    {expandedId === log.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === log.id && (
                  <div className="px-4 pb-4 pl-12 space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">IP Address:</span>{' '}
                        <span className="text-foreground">{log.ipAddress || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Entity ID:</span>{' '}
                        <span className="text-foreground font-mono text-xs">{log.entityId || 'N/A'}</span>
                      </div>
                    </div>
                    {log.beforeData && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Before:</span>
                        <pre className="mt-1 text-xs bg-red-50 p-2 rounded overflow-x-auto max-h-32">
                          {JSON.stringify(log.beforeData, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.afterData && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">After:</span>
                        <pre className="mt-1 text-xs bg-green-50 p-2 rounded overflow-x-auto max-h-32">
                          {JSON.stringify(log.afterData, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.userAgent && (
                      <div className="text-xs text-muted-foreground truncate">
                        User Agent: {log.userAgent}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} entries)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-muted transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-muted transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
