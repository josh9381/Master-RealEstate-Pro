import { Card } from '@/components/ui/Card'
import { Users, Target, TrendingUp } from 'lucide-react'

interface BackendStats {
  total: number
  byStatus: Record<string, number>
  averageScore: number
  totalValue: number
  recentLeads: number
}

interface LeadStatsCardsProps {
  backendStats: BackendStats | null
  totalLeads: number
  globalTotal: number
  currentPage: number
  totalPages: number
  hasActiveFilters: boolean
}

export function LeadStatsCards({ backendStats, totalLeads, globalTotal, currentPage, totalPages, hasActiveFilters }: LeadStatsCardsProps) {
  const total = backendStats?.total || globalTotal || totalLeads
  const qualified = backendStats?.byStatus?.QUALIFIED || 0
  const qualifiedRate = total > 0 ? Math.round((qualified / total) * 100) : 0
  const avgScore = Math.round(backendStats?.averageScore || 0)
  const won = backendStats?.byStatus?.WON || 0
  const lost = backendStats?.byStatus?.LOST || 0
  const closedTotal = won + lost
  const conversionRate = closedTotal > 0 ? Math.round((won / closedTotal) * 100) : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
            <h3 className="mt-2 text-3xl font-bold">{total}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasActiveFilters && globalTotal !== totalLeads
                ? `Showing ${totalLeads} of ${globalTotal} leads`
                : `Showing page ${currentPage} of ${totalPages}`
              }
            </p>
          </div>
          <div className="rounded-full bg-blue-100 p-3">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Qualified Rate</p>
            <h3 className="mt-2 text-3xl font-bold">{qualifiedRate}%</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {qualified} of {total} leads qualified
            </p>
          </div>
          <div className="rounded-full bg-green-100 p-3">
            <Target className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Avg Lead Score</p>
            <h3 className="mt-2 text-3xl font-bold">{avgScore}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {total} leads
            </p>
          </div>
          <div className="rounded-full bg-purple-100 p-3">
            <TrendingUp className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
            <h3 className="mt-2 text-3xl font-bold">{conversionRate}%</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {won} won of {closedTotal} closed leads
            </p>
          </div>
          <div className="rounded-full bg-orange-100 p-3">
            <Target className="h-6 w-6 text-orange-600" />
          </div>
        </div>
      </Card>
    </div>
  )
}
