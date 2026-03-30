import { Request, Response } from 'express';
import prisma from '../config/database';
import { logger } from '../lib/logger';
import { pushCallUpdate } from '../config/socket';
import { calcRate } from '../utils/metricsCalculator';
import { NotFoundError } from '../middleware/errorHandler';

/**
 * Log a manual call (not Vapi AI)
 * POST /api/calls
 */
export async function logCall(req: Request, res: Response) {
  const userId = (req as any).user!.userId;
  const organizationId = (req as any).user!.organizationId;
  const { leadId, phoneNumber, direction, outcome, duration, notes, followUpDate } = req.body;

  // Verify the lead belongs to this organization
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  const call = await prisma.call.create({
    data: {
      organizationId,
      leadId,
      calledById: userId,
      phoneNumber,
      direction: direction || 'OUTBOUND',
      status: 'COMPLETED',
      outcome,
      duration: duration || null,
      notes: notes || null,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
    },
    include: {
      lead: { select: { id: true, firstName: true, lastName: true } },
      calledBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Also create an activity record for the timeline
  try {
    const outcomeLabel = (outcome || 'unknown').replace(/_/g, ' ').toLowerCase();
    const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown';
    await prisma.activity.create({
      data: {
        type: direction === 'INBOUND' ? 'CALL_RECEIVED' : 'CALL_MADE',
        title: `${direction === 'INBOUND' ? 'Received' : 'Made'} call — ${outcomeLabel}`,
        description: `${direction === 'INBOUND' ? 'Received' : 'Made'} a call to ${leadName} — ${outcomeLabel}`,
        leadId,
        userId,
        organizationId,
        metadata: {
          callId: call.id,
          outcome,
          duration,
          phoneNumber,
        },
      },
    });
  } catch (err) {
    // Activity creation is non-critical — log and continue
    logger.warn({ callId: call.id, err }, 'Failed to create activity for call log');
  }

  // If outcome is DNC_REQUEST, optionally flag the lead
  if (outcome === 'DNC_REQUEST') {
    try {
      const existingFields = (await prisma.lead.findUnique({ where: { id: leadId }, select: { customFields: true } }))?.customFields;
      const currentCustomFields = typeof existingFields === 'object' && existingFields !== null ? existingFields : {};
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          customFields: {
            ...(currentCustomFields as Record<string, unknown>),
            doNotCall: true,
            dncRequestedAt: new Date().toISOString(),
            dncRequestedBy: userId,
          },
        },
      });
      logger.info(`Lead ${leadId} flagged as DNC per call outcome`);
    } catch (err) {
      logger.warn({ leadId, err }, 'Failed to flag lead as DNC');
    }
  }

  pushCallUpdate(organizationId, { type: direction === 'INBOUND' ? 'inbound' : 'logged', callId: call.id, leadId });

  logger.info(`Call logged for lead ${leadId} by user ${userId}: ${outcome}`);
  res.status(201).json({ success: true, data: call });
}

/**
 * Get calls for a lead or the entire organization
 * GET /api/calls
 */
export async function getCalls(req: Request, res: Response) {
  const organizationId = (req as any).user!.organizationId;
  const { leadId, direction, outcome, limit, offset, sortBy, sortOrder } =
    (req as any).validatedQuery || req.query;

  const where: Record<string, any> = { organizationId };
  if (leadId) where.leadId = leadId;
  if (direction) where.direction = direction;
  if (outcome) where.outcome = outcome;

  const [calls, total] = await Promise.all([
    prisma.call.findMany({
      where,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        calledBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
      take: Math.min(Number(limit) || 50, 200),
      skip: Number(offset) || 0,
    }),
    prisma.call.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      calls,
      total,
      limit: Math.min(Number(limit) || 50, 200),
      offset: Number(offset) || 0,
    },
  });
}

/**
 * Get a single call by ID
 * GET /api/calls/:id
 */
export async function getCall(req: Request, res: Response) {
  const organizationId = (req as any).user!.organizationId;
  const { id } = req.params;

  const call = await prisma.call.findFirst({
    where: { id, organizationId },
    include: {
      lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      calledBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!call) {
    throw new NotFoundError('Call not found');
  }

  res.json({ success: true, data: call });
}

/**
 * Update a call log
 * PATCH /api/calls/:id
 */
export async function updateCall(req: Request, res: Response) {
  const organizationId = (req as any).user!.organizationId;
  const { id } = req.params;
  const { outcome, duration, notes, followUpDate, status } = req.body;

  // Verify ownership
  const existing = await prisma.call.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new NotFoundError('Call not found');
  }

  const updateData: Record<string, any> = {};
  if (outcome !== undefined) updateData.outcome = outcome;
  if (duration !== undefined) updateData.duration = duration;
  if (notes !== undefined) updateData.notes = notes;
  if (followUpDate !== undefined) updateData.followUpDate = followUpDate ? new Date(followUpDate) : null;
  if (status !== undefined) updateData.status = status;

  const call = await prisma.call.update({
    where: { id },
    data: updateData,
    include: {
      lead: { select: { id: true, firstName: true, lastName: true } },
      calledBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.json({ success: true, data: call });
}

/**
 * Delete a call log
 * DELETE /api/calls/:id
 */
export async function deleteCall(req: Request, res: Response) {
  const organizationId = (req as any).user!.organizationId;
  const { id } = req.params;

  const existing = await prisma.call.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new NotFoundError('Call not found');
  }

  await prisma.call.delete({ where: { id } });

  res.json({ success: true, message: 'Call log deleted' });
}

/**
 * Get smart call queue — prioritized list of leads to call
 * GET /api/calls/queue
 */
export async function getCallQueue(req: Request, res: Response) {
  const organizationId = (req as any).user!.organizationId;
  const limit = Math.min(Number(req.query.limit) || 25, 200);

  // Get leads that have a phone, are not DNC, sorted by score desc + recently active
  const leads = await prisma.lead.findMany({
    where: {
      organizationId,
      phone: { not: null },
      status: { notIn: ['WON', 'LOST'] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
      score: true,
      source: true,
      company: true,
      lastContactAt: true,
      createdAt: true,
      propertyType: true,
      transactionType: true,
      budgetMin: true,
      budgetMax: true,
      customFields: true,
    },
    orderBy: [{ score: 'desc' }, { lastContactAt: 'asc' }],
    take: limit * 2, // over-fetch so we can filter & re-sort
  });

  // Batch-fetch last call and pending reminders for these leads
  const leadIds = leads.map((l) => l.id);
  const [lastCalls, pendingReminders] = await Promise.all([
    prisma.call.findMany({
      where: { leadId: { in: leadIds } },
      orderBy: { createdAt: 'desc' },
      distinct: ['leadId'],
      select: { leadId: true, createdAt: true, outcome: true },
    }),
    prisma.followUpReminder.findMany({
      where: { leadId: { in: leadIds }, dueAt: { lte: new Date() }, status: 'PENDING' },
      distinct: ['leadId'],
      select: { leadId: true, dueAt: true },
    }),
  ]);

  const lastCallByLead = new Map(lastCalls.map((c) => [c.leadId, c]));
  const reminderByLead = new Map(pendingReminders.map((r) => [r.leadId, r]));

  // Filter out DNC leads and ones called in last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const filtered = leads.filter((lead) => {
    const cf = lead.customFields as Record<string, unknown> | null;
    if (cf?.doNotCall) return false;
    const lastCall = lastCallByLead.get(lead.id);
    if (lastCall && new Date(lastCall.createdAt) > oneDayAgo) return false;
    return true;
  });

  // Score and sort: callbacks first, then hot leads, then by recency
  const scored = filtered.map((lead) => {
    let priority = lead.score || 0;
    // Boost leads with pending follow-up reminders (callbacks)
    if (reminderByLead.has(lead.id)) priority += 200;
    // Boost leads never contacted
    if (!lead.lastContactAt) priority += 50;
    // Boost leads contacted long ago
    if (lead.lastContactAt) {
      const daysSince = (Date.now() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 7) priority += 30;
    }
    return { ...lead, _priority: priority };
  });

  scored.sort((a, b) => b._priority - a._priority);

  const queue = scored.slice(0, limit).map(({ _priority, customFields, ...rest }) => {
    const lastCall = lastCallByLead.get(rest.id);
    return {
      ...rest,
      lastCallAt: lastCall?.createdAt || null,
      lastCallOutcome: lastCall?.outcome || null,
      hasCallback: reminderByLead.has(rest.id),
      priority: _priority,
    };
  });

  res.json({ success: true, data: { queue, total: filtered.length } });
}

/**
 * Get today's call stats for the current user
 * GET /api/calls/today-stats
 */
export async function getTodayStats(req: Request, res: Response) {
  const organizationId = (req as any).user!.organizationId;
  const userId = (req as any).user!.userId;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const where = { organizationId, calledById: userId, createdAt: { gte: startOfDay } };

  const [totalCalls, byOutcome, totalDuration] = await Promise.all([
    prisma.call.count({ where }),
    prisma.call.groupBy({
      by: ['outcome'],
      where: { ...where, outcome: { not: null } },
      _count: true,
    }),
    prisma.call.aggregate({
      where: { ...where, duration: { not: null } },
      _sum: { duration: true },
      _avg: { duration: true },
    }),
  ]);

  const outcomes = byOutcome.reduce((acc, item) => {
    if (item.outcome) acc[item.outcome] = item._count;
    return acc;
  }, {} as Record<string, number>);

  const answered = (outcomes['ANSWERED'] || 0) + (outcomes['CALLBACK_SCHEDULED'] || 0) + (outcomes['NOT_INTERESTED'] || 0);
  const connectionRate = calcRate(answered, totalCalls, 0);

  res.json({
    success: true,
    data: {
      totalCalls,
      answered,
      connectionRate,
      totalTalkTimeSeconds: totalDuration._sum.duration || 0,
      avgDurationSeconds: Math.round(totalDuration._avg.duration || 0),
      byOutcome: outcomes,
    },
  });
}

/**
 * Get call stats for a lead or org
 * GET /api/calls/stats
 */
export async function getCallStats(req: Request, res: Response) {
  const organizationId = (req as any).user!.organizationId;
  const leadId = req.query.leadId as string | undefined;

  const where: Record<string, any> = { organizationId };
  if (leadId) where.leadId = leadId;

  const [total, byOutcome, byDirection, avgDuration] = await Promise.all([
    prisma.call.count({ where }),
    prisma.call.groupBy({
      by: ['outcome'],
      where: { ...where, outcome: { not: null } },
      _count: true,
    }),
    prisma.call.groupBy({
      by: ['direction'],
      where,
      _count: true,
    }),
    prisma.call.aggregate({
      where: { ...where, duration: { not: null } },
      _avg: { duration: true },
    }),
  ]);

  res.json({
    success: true,
    data: {
      total,
      byOutcome: byOutcome.reduce((acc, item) => {
        if (item.outcome) acc[item.outcome] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byDirection: byDirection.reduce((acc, item) => {
        acc[item.direction] = item._count;
        return acc;
      }, {} as Record<string, number>),
      avgDurationSeconds: Math.round(avgDuration._avg.duration || 0),
    },
  });
}
