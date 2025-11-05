import prisma from '../config/database'

/**
 * Campaign Analytics Service
 * 
 * Features:
 * - Track and aggregate campaign metrics
 * - Calculate open rates, click rates, conversion rates
 * - Real-time analytics updates
 * - Historical trend analysis
 * - Link click tracking
 */

interface CampaignMetrics {
  sent: number
  delivered: number
  opened: number
  clicked: number
  converted: number
  bounced: number
  unsubscribed: number
  openRate: number
  clickRate: number
  conversionRate: number
  deliveryRate: number
  bounceRate: number
}

interface LinkClickStats {
  url: string
  clicks: number
  uniqueClicks: number
  clickRate: number
}

interface TimeSeriesData {
  date: string
  sent: number
  opened: number
  clicked: number
  converted: number
}

/**
 * Get comprehensive metrics for a campaign
 */
export async function getCampaignMetrics(campaignId: string): Promise<CampaignMetrics> {
  // Get campaign activities
  const activities = await prisma.activity.findMany({
    where: {
      campaignId,
      type: {
        in: ['EMAIL_SENT', 'EMAIL_OPENED', 'EMAIL_CLICKED', 'CAMPAIGN_LAUNCHED', 'CAMPAIGN_COMPLETED'],
      },
    },
    select: {
      type: true,
      metadata: true,
    },
  })

  // Count different event types
  const sent = activities.filter((a) => a.type === 'EMAIL_SENT').length
  const opened = activities.filter((a) => a.type === 'EMAIL_OPENED').length
  const clicked = activities.filter((a) => a.type === 'EMAIL_CLICKED').length

  // Get message stats for this campaign
  const messageIds = activities
    .filter((a) => a.type === 'EMAIL_SENT')
    .map((a) => {
      const metadata = a.metadata as Record<string, unknown>
      return metadata?.messageId as string
    })
    .filter(Boolean)

  let delivered = 0
  let bounced = 0

  if (messageIds.length > 0) {
    const messages = await prisma.message.findMany({
      where: { id: { in: messageIds } },
      select: {
        deliveredAt: true,
        bouncedAt: true,
      },
    })

    delivered = messages.filter((m) => m.deliveredAt !== null).length
    bounced = messages.filter((m) => m.bouncedAt !== null).length
  }

  // Get campaign data for conversions and unsubscribes
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      converted: true,
      unsubscribed: true,
    },
  })

  const converted = campaign?.converted || 0
  const unsubscribed = campaign?.unsubscribed || 0

  // Calculate rates
  const openRate = sent > 0 ? (opened / sent) * 100 : 0
  const clickRate = sent > 0 ? (clicked / sent) * 100 : 0
  const conversionRate = sent > 0 ? (converted / sent) * 100 : 0
  const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0
  const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0

  return {
    sent,
    delivered,
    opened,
    clicked,
    converted,
    bounced,
    unsubscribed,
    openRate: Math.round(openRate * 10) / 10,
    clickRate: Math.round(clickRate * 10) / 10,
    conversionRate: Math.round(conversionRate * 10) / 10,
    deliveryRate: Math.round(deliveryRate * 10) / 10,
    bounceRate: Math.round(bounceRate * 10) / 10,
  }
}

/**
 * Update campaign metrics in real-time
 */
export async function updateCampaignMetrics(campaignId: string): Promise<void> {
  const metrics = await getCampaignMetrics(campaignId)

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      sent: metrics.sent,
      delivered: metrics.delivered,
      opened: metrics.opened,
      clicked: metrics.clicked,
      bounced: metrics.bounced,
    },
  })
}

/**
 * Track email open event
 */
export async function trackEmailOpen(
  campaignId: string,
  leadId: string,
  messageId: string
): Promise<void> {
  // Create activity
  await prisma.activity.create({
    data: {
      type: 'EMAIL_OPENED',
      title: 'Email Opened',
      description: 'Lead opened campaign email',
      campaignId,
      leadId,
      metadata: {
        messageId,
        timestamp: new Date().toISOString(),
      },
    },
  })

  // Update message
  await prisma.message.update({
    where: { id: messageId },
    data: {
      readAt: new Date(),
    },
  })

  // Update campaign metrics
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      opened: { increment: 1 },
    },
  })

  // Update lead score
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      score: { increment: 5 }, // +5 points for email open
    },
  })
}

/**
 * Track email click event
 */
export async function trackEmailClick(
  campaignId: string,
  leadId: string,
  messageId: string,
  url: string
): Promise<void> {
  // Create activity
  await prisma.activity.create({
    data: {
      type: 'EMAIL_CLICKED',
      title: 'Email Link Clicked',
      description: `Lead clicked link: ${url}`,
      campaignId,
      leadId,
      metadata: {
        messageId,
        url,
        timestamp: new Date().toISOString(),
      },
    },
  })

  // Update message metadata to track clicks
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { metadata: true },
  })

  const metadata = (message?.metadata as Record<string, unknown>) || {}
  const clicks = ((metadata.clicks as number) || 0) + 1

  await prisma.message.update({
    where: { id: messageId },
    data: {
      metadata: {
        ...metadata,
        clicked: true,
        clicks,
        lastClickedAt: new Date().toISOString(),
      },
    },
  })

  // Update campaign metrics
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      clicked: { increment: 1 },
    },
  })

  // Update lead score
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      score: { increment: 10 }, // +10 points for email click
    },
  })
}

/**
 * Track conversion event
 */
export async function trackConversion(
  campaignId: string,
  leadId: string,
  value?: number
): Promise<void> {
  // Create activity
  await prisma.activity.create({
    data: {
      type: 'LEAD_CREATED', // Using existing enum value
      title: 'Campaign Conversion',
      description: 'Lead converted from campaign',
      campaignId,
      leadId,
      metadata: {
        conversion: true,
        value,
        timestamp: new Date().toISOString(),
      },
    },
  })

  // Update campaign metrics
  const updateData: Record<string, unknown> = {
    converted: { increment: 1 },
  }

  if (value) {
    updateData.revenue = { increment: value }
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: updateData,
  })

  // Update lead score
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      score: { increment: 40 }, // +40 points for conversion
    },
  })
}

/**
 * Get link click statistics for a campaign
 */
export async function getLinkClickStats(campaignId: string): Promise<LinkClickStats[]> {
  const activities = await prisma.activity.findMany({
    where: {
      campaignId,
      type: 'EMAIL_CLICKED',
    },
    select: {
      metadata: true,
      leadId: true,
    },
  })

  // Group by URL
  const urlStats = activities.reduce(
    (acc, activity) => {
      const metadata = activity.metadata as Record<string, unknown>
      const url = metadata?.url as string

      if (!url) return acc

      if (!acc[url]) {
        acc[url] = {
          url,
          clicks: 0,
          uniqueLeads: new Set<string>(),
        }
      }

      acc[url].clicks++
      if (activity.leadId) {
        acc[url].uniqueLeads.add(activity.leadId)
      }

      return acc
    },
    {} as Record<string, { url: string; clicks: number; uniqueLeads: Set<string> }>
  )

  // Get total sent for click rate calculation
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { sent: true },
  })

  const totalSent = campaign?.sent || 1

  // Convert to array and calculate rates
  return Object.values(urlStats)
    .map((stat) => ({
      url: stat.url,
      clicks: stat.clicks,
      uniqueClicks: stat.uniqueLeads.size,
      clickRate: Math.round((stat.clicks / totalSent) * 1000) / 10,
    }))
    .sort((a, b) => b.clicks - a.clicks)
}

/**
 * Get time series data for campaign performance
 */
export async function getCampaignTimeSeries(
  campaignId: string,
  days = 30
): Promise<TimeSeriesData[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const activities = await prisma.activity.findMany({
    where: {
      campaignId,
      createdAt: { gte: startDate },
      type: {
        in: ['EMAIL_SENT', 'EMAIL_OPENED', 'EMAIL_CLICKED'],
      },
    },
    select: {
      type: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  // Group by date
  const dailyStats = activities.reduce(
    (acc, activity) => {
      const date = activity.createdAt.toISOString().split('T')[0]

      if (!acc[date]) {
        acc[date] = {
          date,
          sent: 0,
          opened: 0,
          clicked: 0,
          converted: 0,
        }
      }

      if (activity.type === 'EMAIL_SENT') acc[date].sent++
      if (activity.type === 'EMAIL_OPENED') acc[date].opened++
      if (activity.type === 'EMAIL_CLICKED') acc[date].clicked++

      const metadata = activity.metadata as Record<string, unknown>
      if (metadata?.conversion) acc[date].converted++

      return acc
    },
    {} as Record<string, TimeSeriesData>
  )

  // Fill in missing dates with zeros
  const result: TimeSeriesData[] = []
  const currentDate = new Date(startDate)
  const endDate = new Date()

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    result.push(
      dailyStats[dateStr] || {
        date: dateStr,
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
      }
    )
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return result
}

/**
 * Get campaign comparison metrics
 */
export async function compareCampaigns(
  campaignIds: string[]
): Promise<Array<{ campaignId: string; name: string; metrics: CampaignMetrics }>> {
  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: campaignIds } },
    select: {
      id: true,
      name: true,
    },
  })

  const results = await Promise.all(
    campaigns.map(async (campaign) => ({
      campaignId: campaign.id,
      name: campaign.name,
      metrics: await getCampaignMetrics(campaign.id),
    }))
  )

  return results
}

/**
 * Get top performing campaigns
 */
export async function getTopPerformingCampaigns(
  limit = 10,
  metric: 'openRate' | 'clickRate' | 'conversionRate' = 'conversionRate'
): Promise<Array<{ campaign: { id: string; name: string }; metrics: CampaignMetrics }>> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: { in: ['ACTIVE', 'COMPLETED'] },
      sent: { gt: 0 },
    },
    select: {
      id: true,
      name: true,
    },
    take: 100, // Get top 100 to calculate metrics
  })

  const campaignsWithMetrics = await Promise.all(
    campaigns.map(async (campaign) => ({
      campaign,
      metrics: await getCampaignMetrics(campaign.id),
    }))
  )

  // Sort by selected metric
  campaignsWithMetrics.sort((a, b) => b.metrics[metric] - a.metrics[metric])

  return campaignsWithMetrics.slice(0, limit)
}
