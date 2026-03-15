import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/Button'

const SOCIAL_MEDIA_SOURCES = ['linkedin', 'instagram', 'facebook ads', 'google ads', 'youtube', 'social media', 'social']

interface LeadChartsProps {
  sourceData: Array<{ name: string; value: number }>
  scoreData: Array<{ range: string; count: number }>
  pageCount?: number
  totalCount?: number
  isGlobalData?: boolean
}

export function LeadCharts({ sourceData, scoreData, pageCount, totalCount, isGlobalData }: LeadChartsProps) {
  const [showAllSources, setShowAllSources] = useState(false)

  // Group social media sources into one bucket for the chart
  const groupedSourceData = (() => {
    const socialTotal = sourceData
      .filter(s => SOCIAL_MEDIA_SOURCES.includes(s.name.toLowerCase()))
      .reduce((sum, s) => sum + s.value, 0)
    const nonSocial = sourceData.filter(s => !SOCIAL_MEDIA_SOURCES.includes(s.name.toLowerCase()))
    const result = socialTotal > 0 ? [...nonSocial, { name: 'Social Media', value: socialTotal }] : nonSocial
    return result.sort((a, b) => b.value - a.value)
  })()

  // Top 5 + "Other" for chart display
  const chartData = (() => {
    if (showAllSources) return groupedSourceData
    const top5 = groupedSourceData.slice(0, 5)
    const otherTotal = groupedSourceData.slice(5).reduce((sum, s) => sum + s.value, 0)
    if (otherTotal > 0) top5.push({ name: 'Other', value: otherTotal })
    return top5
  })()

  const isPartialData = !isGlobalData && totalCount != null && pageCount != null && pageCount < totalCount

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Lead Source Breakdown</h3>
            {isGlobalData && totalCount != null && (
              <p className="text-xs text-muted-foreground">Based on all {totalCount} leads</p>
            )}
            {isPartialData && (
              <p className="text-xs text-muted-foreground">Showing {pageCount} of {totalCount} leads on this page</p>
            )}
          </div>
          {groupedSourceData.length > 5 && (
            <Button variant="ghost" size="sm" onClick={() => setShowAllSources(!showAllSources)}>
              {showAllSources ? 'Show Top 5' : 'View All'}
            </Button>
          )}
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" name="Leads" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Lead Score Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={scoreData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#3b82f6" name="Number of Leads" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
