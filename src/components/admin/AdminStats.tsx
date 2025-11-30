import { useQuery } from '@tanstack/react-query'
import { Users, Mail, Target, Activity, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'

interface AdminStatsData {
  stats: {
    totalUsers: number
    totalLeads: number
    totalCampaigns: number
    totalWorkflows: number
  }
}

/**
 * Admin Statistics Dashboard Component
 * Fetches and displays key organization metrics from /api/admin/stats
 * Only accessible to ADMIN and MANAGER roles
 */
export function AdminStats() {
  const { isAdmin, isManager } = useAuthStore()
  
  const { data, isLoading, error, refetch } = useQuery<AdminStatsData>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/stats')
      return response.data
    },
    enabled: isAdmin() || isManager(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })
  
  if (!isAdmin() && !isManager()) {
    return null
  }
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-red-900 font-medium">Failed to load statistics</p>
          <p className="text-red-700 text-sm">Please try again</p>
        </div>
        <button 
          onClick={() => refetch()}
          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    )
  }
  
  if (!data) {
    return null
  }
  
  const stats = [
    {
      label: 'Total Users',
      value: data.stats.totalUsers,
      subValue: 'Active in system',
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Total Leads',
      value: data.stats.totalLeads,
      subValue: 'In pipeline',
      icon: Mail,
      color: 'green',
    },
    {
      label: 'Campaigns',
      value: data.stats.totalCampaigns,
      subValue: 'Total campaigns',
      icon: Target,
      color: 'purple',
    },
    {
      label: 'Workflows',
      value: data.stats.totalWorkflows,
      subValue: 'Automation flows',
      icon: Activity,
      color: 'orange',
    },
  ]
  
  const colorClasses = {
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-600',
      ring: 'ring-blue-600',
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-600',
      ring: 'ring-green-600',
    },
    purple: {
      bg: 'bg-purple-100',
      text: 'text-purple-600',
      ring: 'ring-purple-600',
    },
    orange: {
      bg: 'bg-orange-100',
      text: 'text-orange-600',
      ring: 'ring-orange-600',
    },
  }
  
  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const colors = colorClasses[stat.color as keyof typeof colorClasses]
          const Icon = stat.icon
          
          return (
            <div 
              key={stat.label}
              className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
              </div>
              
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">{stat.subValue}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
