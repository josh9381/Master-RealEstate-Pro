import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Mail, Shield, UserCog, User as UserIcon, Search, Filter } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'

interface TeamMember {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: 'ADMIN' | 'MANAGER' | 'USER'
  isActive: boolean
  lastLogin: string | null
  createdAt: string
}

interface TeamMembersResponse {
  members: TeamMember[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Team Management component - displays and manages team members
 * Uses TanStack Query to fetch real data from /api/admin/team-members
 * Shows different views for ADMIN vs MANAGER roles
 */
export function TeamManagement() {
  const { isAdmin, isManager, user } = useAuthStore()
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Fetch team members from API
  const { data, isLoading, error, refetch } = useQuery<TeamMembersResponse>({
    queryKey: ['team-members', page, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })
      if (roleFilter !== 'all') {
        params.append('role', roleFilter)
      }
      const response = await api.get(`/admin/team-members?${params}`)
      return response.data?.data || response.data
    },
    enabled: isAdmin() || isManager(),
  })
  
  // Client-side search filter
  const filteredMembers = data?.members?.filter(member => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      member.email.toLowerCase().includes(search) ||
      member.firstName?.toLowerCase().includes(search) ||
      member.lastName?.toLowerCase().includes(search)
    )
  }) || []
  
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="w-4 h-4 text-warning" />
      case 'MANAGER':
        return <UserCog className="w-4 h-4 text-primary" />
      default:
        return <UserIcon className="w-4 h-4 text-muted-foreground" />
    }
  }
  
  const getRoleBadge = (role: string) => {
    const styles = {
      ADMIN: 'bg-warning/10 text-warning border-warning/20',
      MANAGER: 'bg-primary/10 text-primary border-primary/20',
      USER: 'bg-muted text-muted-foreground border-border',
    }
    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${styles[role as keyof typeof styles]}`}>
        {role}
      </span>
    )
  }
  
  if (!isAdmin() && !isManager()) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p>You don't have permission to view team members.</p>
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-2">Failed to load team members</p>
        <button 
          onClick={() => refetch()}
          className="text-primary hover:text-primary/80 text-sm font-medium"
        >
          Try again
        </button>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Team Members</h3>
          <span className="text-sm text-muted-foreground">({data?.total || 0})</span>
        </div>
        
        {isAdmin() && (
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
            + Invite Member
          </button>
        )}
      </div>
      
      {/* Filters */}
      <div className="flex gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
        
        {/* Role Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none"
          >
            <option value="all">All Roles</option>
            <option value="ADMIN">Admins</option>
            <option value="MANAGER">Managers</option>
            <option value="USER">Users</option>
          </select>
        </div>
      </div>
      
      {/* Team Members List */}
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p>No team members found</p>
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div key={member.id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                {/* Member Info */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {member.firstName?.[0] || member.email[0].toUpperCase()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">
                        {member.firstName && member.lastName 
                          ? `${member.firstName} ${member.lastName}`
                          : member.email
                        }
                      </p>
                      {member.id === user?.id && (
                        <span className="text-xs text-primary font-medium">(You)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  </div>
                </div>
                
                {/* Role & Status */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(member.role)}
                    {getRoleBadge(member.role)}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${member.isActive ? 'bg-success' : 'bg-muted-foreground/40'}`} />
                    <span className="text-xs text-muted-foreground">
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, data.total)} of {data.total} members
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-input rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="px-3 py-1 border border-input rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
