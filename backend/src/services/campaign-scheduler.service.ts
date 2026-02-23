/**
 * Campaign Scheduler Service
 * Checks for scheduled campaigns and executes them automatically
 * Supports both one-time and recurring campaigns
 */

import { prisma } from '../config/database';
import { executeCampaign } from './campaign-executor.service';

/**
 * Calculate the next send date for a recurring campaign
 */
function calculateNextSendDate(
  lastSentAt: Date,
  frequency: string,
  recurringPattern: any
): Date | null {
  const next = new Date(lastSentAt);
  
  switch (frequency) {
    case 'daily':
      // Send every day at the specified time
      next.setDate(next.getDate() + 1);
      if (recurringPattern?.time) {
        const [hours, minutes] = recurringPattern.time.split(':');
        next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      break;
      
    case 'weekly':
      // Send on specific days of the week
      if (recurringPattern?.daysOfWeek && Array.isArray(recurringPattern.daysOfWeek)) {
        const currentDay = next.getDay();
        const daysOfWeek = recurringPattern.daysOfWeek.sort((a: number, b: number) => a - b);
        
        // Find the next day of week
        let nextDay = daysOfWeek.find((day: number) => day > currentDay);
        
        if (nextDay === undefined) {
          // Wrap to next week
          nextDay = daysOfWeek[0];
          const daysToAdd = (7 - currentDay) + nextDay;
          next.setDate(next.getDate() + daysToAdd);
        } else {
          const daysToAdd = nextDay - currentDay;
          next.setDate(next.getDate() + daysToAdd);
        }
        
        if (recurringPattern?.time) {
          const [hours, minutes] = recurringPattern.time.split(':');
          next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
      } else {
        // Default to 7 days later
        next.setDate(next.getDate() + 7);
      }
      break;
      
    case 'monthly':
      // Send on a specific day of the month
      if (recurringPattern?.dayOfMonth) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(Math.min(recurringPattern.dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
        
        if (recurringPattern?.time) {
          const [hours, minutes] = recurringPattern.time.split(':');
          next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
      } else {
        // Default to same day next month
        next.setMonth(next.getMonth() + 1);
      }
      break;
      
    default:
      console.error(`[SCHEDULER] Unknown frequency: ${frequency}`);
      return null;
  }
  
  return next;
}

/**
 * Check for scheduled campaigns and recurring campaigns that should be sent now
 * Called by cron job every minute
 */
export async function checkAndExecuteScheduledCampaigns(): Promise<void> {
  const now = new Date();
  
  console.log(`[CAMPAIGN SCHEDULER] Checking for scheduled campaigns at ${now.toISOString()}`);

  try {
    // Find campaigns that are:
    // 1. One-time: Status = SCHEDULED and startDate <= now
    // 2. Recurring: isRecurring = true, status = ACTIVE, and nextSendAt <= now
    const [oneTimeCampaigns, recurringCampaigns] = await Promise.all([
      prisma.campaign.findMany({
        where: {
          status: 'SCHEDULED',
          isRecurring: false,
          startDate: {
            lte: now,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.campaign.findMany({
        where: {
          isRecurring: true,
          status: 'ACTIVE',
          nextSendAt: {
            lte: now,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    const campaignsToSend = [...oneTimeCampaigns, ...recurringCampaigns];

    if (campaignsToSend.length === 0) {
      console.log(`[CAMPAIGN SCHEDULER] No campaigns to send at this time`);
      return;
    }

    console.log(
      `[CAMPAIGN SCHEDULER] Found ${campaignsToSend.length} campaign(s) to send ` +
      `(${oneTimeCampaigns.length} one-time, ${recurringCampaigns.length} recurring)`
    );

    // Execute each campaign
    for (const campaign of campaignsToSend) {
      try {
        console.log(
          `[CAMPAIGN SCHEDULER] Executing ${campaign.isRecurring ? 'recurring' : 'one-time'} ` +
          `campaign: ${campaign.name} (ID: ${campaign.id})`
        );
        
        // Set status to SENDING before execution to prevent duplicate sends
        // if execution takes longer than the scheduler interval (1 minute)
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: 'SENDING' },
        });

        // Execute the campaign
        const result = await executeCampaign({
          campaignId: campaign.id,
        });

        if (result.success) {
          console.log(
            `[CAMPAIGN SCHEDULER] ✅ Campaign "${campaign.name}" sent successfully! ` +
            `Sent: ${result.sent}, Failed: ${result.failed}`
          );
          
          if (campaign.isRecurring) {
            // Handle recurring campaign
            const newOccurrenceCount = campaign.occurrenceCount + 1;
            const hasReachedMaxOccurrences = 
              campaign.maxOccurrences && newOccurrenceCount >= campaign.maxOccurrences;
            const hasReachedEndDate = 
              campaign.endDate && new Date(campaign.endDate) <= now;
            
            if (hasReachedMaxOccurrences || hasReachedEndDate) {
              // Campaign has reached its limit
              console.log(
                `[CAMPAIGN SCHEDULER] Campaign "${campaign.name}" has reached its end ` +
                `(occurrences: ${newOccurrenceCount}/${campaign.maxOccurrences || '∞'}, ` +
                `endDate: ${campaign.endDate || 'none'})`
              );
              
              await prisma.campaign.update({
                where: { id: campaign.id },
                data: {
                  status: 'COMPLETED',
                  occurrenceCount: newOccurrenceCount,
                  lastSentAt: now,
                  nextSendAt: null,
                },
              });
            } else {
              // Calculate next send date
              const nextSendAt = calculateNextSendDate(
                now,
                campaign.frequency || 'weekly',
                campaign.recurringPattern
              );
              
              if (nextSendAt) {
                console.log(
                  `[CAMPAIGN SCHEDULER] Next occurrence of "${campaign.name}" scheduled for ` +
                  `${nextSendAt.toISOString()}`
                );
                
                await prisma.campaign.update({
                  where: { id: campaign.id },
                  data: {
                    occurrenceCount: newOccurrenceCount,
                    lastSentAt: now,
                    nextSendAt,
                  },
                });
              } else {
                console.error(
                  `[CAMPAIGN SCHEDULER] Failed to calculate next send date for "${campaign.name}"`
                );
                
                await prisma.campaign.update({
                  where: { id: campaign.id },
                  data: {
                    status: 'PAUSED',
                    occurrenceCount: newOccurrenceCount,
                    lastSentAt: now,
                  },
                });
              }
            }
          } else {
            // One-time campaign - mark as completed
            await prisma.campaign.update({
              where: { id: campaign.id },
              data: {
                status: 'COMPLETED',
                endDate: now,
              },
            });
          }
        } else {
          console.error(
            `[CAMPAIGN SCHEDULER] ❌ Campaign "${campaign.name}" failed to send:`,
            result.errors
          );
          
          // Pause failed campaigns (both one-time and recurring)
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: {
              status: 'PAUSED',
            },
          });
        }
      } catch (error) {
        console.error(
          `[CAMPAIGN SCHEDULER] ❌ Error executing campaign "${campaign.name}":`,
          error
        );
        
        // Update campaign status to paused on error
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: 'PAUSED',
          },
        });
      }
    }

    console.log(`[CAMPAIGN SCHEDULER] ✅ Finished processing ${campaignsToSend.length} campaign(s)`);
  } catch (error) {
    console.error('[CAMPAIGN SCHEDULER] ❌ Error in scheduler:', error);
  }
}

/**
 * Get statistics about scheduled and recurring campaigns
 */
export async function getScheduledCampaignsStats() {
  const now = new Date();
  
  const [scheduled, overdue, recurring, recurringDue] = await Promise.all([
    // Total scheduled one-time campaigns
    prisma.campaign.count({
      where: {
        status: 'SCHEDULED',
        isRecurring: false,
      },
    }),
    
    // Overdue one-time campaigns (scheduled in the past but not sent)
    prisma.campaign.count({
      where: {
        status: 'SCHEDULED',
        isRecurring: false,
        startDate: {
          lt: now,
        },
      },
    }),
    
    // Total active recurring campaigns
    prisma.campaign.count({
      where: {
        isRecurring: true,
        status: 'ACTIVE',
      },
    }),
    
    // Recurring campaigns due now
    prisma.campaign.count({
      where: {
        isRecurring: true,
        status: 'ACTIVE',
        nextSendAt: {
          lte: now,
        },
      },
    }),
  ]);

  return {
    scheduled,
    overdue,
    upcoming: scheduled - overdue,
    recurring,
    recurringDue,
  };
}
