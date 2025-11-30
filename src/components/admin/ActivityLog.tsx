import { useQuery } from '@tanstack/react-query'
import { Clock, User, Shield, Mail, Target, Workflow, Settings, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatDistanceToNow } from 'date-fns'
import api from '@/lib/api'

interface Activity {
  id: string
  type: string
  description: string
  userId: string
  user: {
    firstName: string | null
    lastName: string | null
    email: string
  }
  createdAt: string
}

interface ActivityLogResponse {
  activities: Activity[]
  total: number
  page: number
  limit: number
}

/**
 * Activity Log Component
 * Displays recent activity in the organization
 * Fetches from /api/admin/activity-logs
 * MANAGERs only see their own activities, ADMINs see all
 */
export function ActivityLog() {
  const { isAdmin, isManager, user } = useAuthStore()
  
  const { data, isLoading, error, refetch } = useQuery<ActivityLogResponse>({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const response = await api.get('/admin/activity-logs?limit=10')
      return response.data
    },
    enabled: isAdmin() || isManager(),
    refetchInterval: 60000, // Refresh every minute
  })
  
  if (!isAdmin() && !isManager()) {
    return null
  }
  
  const getActivityIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'USER_CREATED':
      case 'USER_UPDATED':
      case 'USER_DELETED':
        return <User className="w-4 h-4" />
      case 'LEAD_CREATED':
      case 'LEAD_UPDATED':
      case 'LEAD_DELETED':
        return <Mail className="w-4 h-4" />
      case 'CAMPAIGN_CREATED':
      case 'CAMPAIGN_UPDATED':
      case 'CAMPAIGN_DELETED':
        return <Target className="w-4 h-4" />
      case 'WORKFLOW_CREATED':
      case 'WORKFLOW_UPDATED':
      case 'WORKFLOW_DELETED':
        return <Workflow className="w-4 h-4" />
      case 'ROLE_CHANGED':
        return <Shield className="w-4 h-4" />
      case 'SETTINGS_UPDATED':
        return <Settings className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }
  
  const getActivityColor = (type: string) => {
    if (type.includes('CREATED')) return 'text-green-600 bg-green-100'
    if (type.includes('UPDATED')) return 'text-blue-600 bg-blue-100'
    if (type.includes('DELETED')) return 'text-red-600 bg-red-100'
    return 'text-gray-600 bg-gray-100'
  }
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <div className="flex-1">
            <p className="font-medium">Failed to load activity log</p>
            <button 
              onClick={() => refetch()}
              className="text-sm underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  const activities = data?.activities || []
  
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          
          {!isAdmin() && isManager() && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Your activities only
            </span>
          )}
        </div>
      </div>
      
      {/* Activity List */}
      <div className="divide-y divide-gray-200">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => {
            const isCurrentUser = activity.userId === user?.id
            
            return (
              <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {activity.description}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      {activity.user.firstName && activity.user.lastName ? (
                        <span className="font-medium">
                          {activity.user.firstName} {activity.user.lastName}
                          {isCurrentUser && <span className="text-blue-600"> (You)</span>}
                        </span>
                      ) : (
                        <span className="font-medium">
                          {activity.user.email}
                          {isCurrentUser && <span className="text-blue-600"> (You)</span>}
                        </span>
                      )}
                      
                      <span>•</span>
                      
                      <span>
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
      
      {/* Footer */}
      {activities.length > 0 && (
        <div className="p-4 border-t border-gray-200 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all activity
          </button>
        </div>
      )}
    </div>
  )
}
