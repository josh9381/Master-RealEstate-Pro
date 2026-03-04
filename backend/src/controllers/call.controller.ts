import { Request, Response } from 'express';
import prisma from '../config/database';
import { logger } from '../lib/logger';

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
    return res.status(404).json({ success: false, message: 'Lead not found' });
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
    const outcomeLabel = outcome.replace(/_/g, ' ').toLowerCase();
    await prisma.activity.create({
      data: {
        type: direction === 'INBOUND' ? 'CALL_RECEIVED' : 'CALL_MADE',
        title: `${direction === 'INBOUND' ? 'Received' : 'Made'} call — ${outcomeLabel}`,
        description: `${direction === 'INBOUND' ? 'Received' : 'Made'} a call to ${lead.firstName} ${lead.lastName} — ${outcomeLabel}`,
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

  const where: any = { organizationId };
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
      take: Number(limit) || 50,
      skip: Number(offset) || 0,
    }),
    prisma.call.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      calls,
      total,
      limit: Number(limit) || 50,
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
    return res.status(404).json({ success: false, message: 'Call not found' });
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
    return res.status(404).json({ success: false, message: 'Call not found' });
  }

  const updateData: any = {};
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
    return res.status(404).json({ success: false, message: 'Call not found' });
  }

  await prisma.call.delete({ where: { id } });

  res.json({ success: true, message: 'Call log deleted' });
}

/**
 * Get call stats for a lead or org
 * GET /api/calls/stats
 */
export async function getCallStats(req: Request, res: Response) {
  const organizationId = (req as any).user!.organizationId;
  const leadId = req.query.leadId as string | undefined;

  const where: any = { organizationId };
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
