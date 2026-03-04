/**
 * Send-Time Optimization Service
 *
 * Analyzes historical engagement data and lead timezones to determine
 * the optimal send time for each lead in a campaign.
 *
 * Two strategies (can be combined):
 * 1. Timezone optimization: Send at a target hour in each lead's local timezone
 * 2. Engagement optimization: Analyze past open/click times to find peak hours per lead
 */

import { prisma } from '../config/database';

export type OptimizationStrategy = 'none' | 'timezone' | 'engagement' | 'both';

interface LeadSendSlot {
  leadId: string;
  sendAt: Date;       // When this specific lead should receive the message
  reason: string;     // Human-readable reason for this time
}

interface OptimizationResult {
  strategy: OptimizationStrategy;
  slots: Map<string, LeadSendSlot>;  // leadId → slot
  totalSlots: number;
  uniqueTimeSlots: number;
}

// Default target hour (in lead's local time) for timezone optimization
const DEFAULT_TARGET_HOUR = 10; // 10:00 AM local time
const DEFAULT_TARGET_MINUTE = 0;

/**
 * Calculate optimal send times for a list of leads.
 * Returns a Map of leadId → optimal send Date.
 */
export async function calculateOptimalSendTimes(
  leadIds: string[],
  strategy: OptimizationStrategy,
  baseDate: Date = new Date(),
  options?: { targetHour?: number; targetMinute?: number }
): Promise<OptimizationResult> {
  if (strategy === 'none' || leadIds.length === 0) {
    // No optimization — send everything now
    const slots = new Map<string, LeadSendSlot>();
    for (const id of leadIds) {
      slots.set(id, { leadId: id, sendAt: baseDate, reason: 'No optimization' });
    }
    return { strategy, slots, totalSlots: slots.size, uniqueTimeSlots: 1 };
  }

  // Fetch leads with timezone info
  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
    select: { id: true, timezone: true },
  });

  const leadMap = new Map(leads.map((l) => [l.id, l]));
  let engagementData: Map<string, number[]> = new Map(); // leadId → array of hour-of-day opens

  // Fetch historical engagement data if needed
  if (strategy === 'engagement' || strategy === 'both') {
    engagementData = await getHistoricalEngagementHours(leadIds);
  }

  const targetHour = options?.targetHour ?? DEFAULT_TARGET_HOUR;
  const targetMinute = options?.targetMinute ?? DEFAULT_TARGET_MINUTE;
  const slots = new Map<string, LeadSendSlot>();

  for (const leadId of leadIds) {
    const lead = leadMap.get(leadId);
    let sendAt = new Date(baseDate);
    let reason = '';

    if (strategy === 'timezone' || strategy === 'both') {
      // Timezone-based: Calculate what time it is NOW in the lead's timezone,
      // then determine when target hour occurs in UTC
      const tz = lead?.timezone || 'America/New_York'; // Default to Eastern
      sendAt = getTargetTimeInTimezone(tz, targetHour, targetMinute, baseDate);
      reason = `Timezone (${tz}) → ${targetHour}:${String(targetMinute).padStart(2, '0')} local`;
    }

    if (strategy === 'engagement' || strategy === 'both') {
      // Engagement-based: Find peak open hour for this lead
      const hours = engagementData.get(leadId);
      if (hours && hours.length >= 3) {
        // Find the most common open hour
        const hourCounts = new Array(24).fill(0);
        hours.forEach((h) => hourCounts[h]++);
        const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

        if (strategy === 'engagement') {
          // Pure engagement: send at peak hour
          const tz = lead?.timezone || 'America/New_York';
          sendAt = getTargetTimeInTimezone(tz, peakHour, 0, baseDate);
          reason = `Peak engagement hour: ${peakHour}:00 (${hours.length} data points)`;
        } else {
          // Combined: average between timezone target and engagement peak
          const tz = lead?.timezone || 'America/New_York';
          const avgHour = Math.round((targetHour + peakHour) / 2);
          sendAt = getTargetTimeInTimezone(tz, avgHour, 0, baseDate);
          reason += ` + Engagement peak ${peakHour}:00 → send ${avgHour}:00`;
        }
      } else if (strategy === 'engagement') {
        // Not enough data — fall back to timezone or immediate
        const tz = lead?.timezone || 'America/New_York';
        sendAt = getTargetTimeInTimezone(tz, targetHour, targetMinute, baseDate);
        reason = `Insufficient engagement data, fallback to ${targetHour}:00 local`;
      }
    }

    // If calculated time is in the past, push to next day
    if (sendAt < baseDate) {
      sendAt.setDate(sendAt.getDate() + 1);
      reason += ' (next day)';
    }

    slots.set(leadId, { leadId, sendAt, reason });
  }

  // Count unique time slots (rounded to 15-min intervals)
  const uniqueTimes = new Set(
    Array.from(slots.values()).map((s) => {
      const d = s.sendAt;
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${Math.floor(d.getMinutes() / 15)}`;
    })
  );

  return {
    strategy,
    slots,
    totalSlots: slots.size,
    uniqueTimeSlots: uniqueTimes.size,
  };
}

/**
 * Get historical open hours for leads by analyzing CampaignLead.openedAt
 * and Message.readAt records.
 */
async function getHistoricalEngagementHours(leadIds: string[]): Promise<Map<string, number[]>> {
  const result = new Map<string, number[]>();

  // Query CampaignLead opens (past 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [campaignOpens, messageOpens] = await Promise.all([
    prisma.campaignLead.findMany({
      where: {
        leadId: { in: leadIds },
        openedAt: { not: null, gte: ninetyDaysAgo },
      },
      select: { leadId: true, openedAt: true },
    }),
    prisma.message.findMany({
      where: {
        leadId: { in: leadIds },
        readAt: { not: null, gte: ninetyDaysAgo },
      },
      select: { leadId: true, readAt: true },
    }),
  ]);

  for (const row of campaignOpens) {
    if (!row.openedAt || !row.leadId) continue;
    if (!result.has(row.leadId)) result.set(row.leadId, []);
    result.get(row.leadId)!.push(row.openedAt.getUTCHours());
  }

  for (const row of messageOpens) {
    if (!row.readAt || !row.leadId) continue;
    if (!result.has(row.leadId)) result.set(row.leadId, []);
    result.get(row.leadId)!.push(row.readAt.getUTCHours());
  }

  return result;
}

/**
 * Calculate a UTC Date that corresponds to a target local time in a given timezone.
 */
function getTargetTimeInTimezone(
  timezone: string,
  targetHour: number,
  targetMinute: number,
  referenceDate: Date
): Date {
  try {
    // Get current time in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(referenceDate);
    const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
    
    const localHour = get('hour');
    const localMinute = get('minute');
    
    // Calculate the offset in minutes between current local time and target time
    const currentMinutes = localHour * 60 + localMinute;
    const targetMinutes = targetHour * 60 + targetMinute;
    let diffMinutes = targetMinutes - currentMinutes;
    
    // Create the target date by adding the difference
    const targetDate = new Date(referenceDate.getTime() + diffMinutes * 60000);
    return targetDate;
  } catch {
    // Invalid timezone — return reference date
    return new Date(referenceDate);
  }
}

/**
 * Group leads by their send time slot (15-minute intervals).
 * Used by the campaign executor to batch sends.
 */
export function groupLeadsBySendSlot(
  slots: Map<string, LeadSendSlot>
): Map<string, string[]> {
  const groups = new Map<string, string[]>(); // ISO timestamp → leadIds

  for (const [leadId, slot] of slots) {
    // Round to 15-minute intervals
    const d = new Date(slot.sendAt);
    d.setMinutes(Math.floor(d.getMinutes() / 15) * 15, 0, 0);
    const key = d.toISOString();

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(leadId);
  }

  return groups;
}
