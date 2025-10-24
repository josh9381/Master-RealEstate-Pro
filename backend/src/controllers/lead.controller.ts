import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, ConflictError, ValidationError } from '../middleware/errorHandler';
import type { LeadStatus } from '@prisma/client';

/**
 * Get all leads with filtering, pagination, and sorting
 * GET /api/leads
 */
export async function getLeads(req: Request, res: Response): Promise<void> {
  // Get validated query parameters
  const query = (req.validatedQuery || req.query) as {
    page?: number;
    limit?: number;
    status?: LeadStatus;
    source?: string;
    assignedToId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    minScore?: number;
    maxScore?: number;
    minValue?: number;
    maxValue?: number;
  };

  const {
    page = 1,
    limit = 20,
    status,
    source,
    assignedToId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    minScore,
    maxScore,
    minValue,
    maxValue,
  } = query;

  // Build where clause
  const where: any = {};

  if (status) where.status = status as LeadStatus;
  if (source) where.source = source;
  if (assignedToId) where.assignedToId = assignedToId;
  
  // Score filtering
  if (minScore !== undefined || maxScore !== undefined) {
    where.score = {};
    if (minScore !== undefined) where.score.gte = Number(minScore);
    if (maxScore !== undefined) where.score.lte = Number(maxScore);
  }
  
  // Value filtering
  if (minValue !== undefined || maxValue !== undefined) {
    where.value = {};
    if (minValue !== undefined) where.value.gte = Number(minValue);
    if (maxValue !== undefined) where.value.lte = Number(maxValue);
  }

  // Search in name, email, company
  // Note: SQLite doesn't support mode: 'insensitive', but SQLite is case-insensitive by default
  if (search) {
    where.OR = [
      { name: { contains: search as string } },
      { email: { contains: search as string } },
      { company: { contains: search as string } },
    ];
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Execute queries
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        _count: {
          select: {
            notes: true,
            activities: true,
          },
        },
      },
      skip,
      take,
      orderBy: {
        [sortBy as string]: sortOrder,
      },
    }),
    prisma.lead.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      leads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
}

/**
 * Get a single lead by ID
 * GET /api/leads/:id
 */
export async function getLead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
      tags: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      notes: {
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      activities: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50, // Latest 50 activities
      },
    },
  });

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  res.status(200).json({
    success: true,
    data: { lead },
  });
}

/**
 * Create a new lead
 * POST /api/leads
 */
export async function createLead(req: Request, res: Response): Promise<void> {
  const { name, email, phone, company, position, status, source, value, stage, assignedToId, customFields } = req.body;

  // Check if email already exists
  const existingLead = await prisma.lead.findUnique({
    where: { email },
  });

  if (existingLead) {
    throw new ConflictError('A lead with this email already exists');
  }

  // If assignedToId is provided, verify the user exists
  if (assignedToId) {
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId },
    });

    if (!assignedUser) {
      throw new ValidationError('Assigned user not found');
    }
  }

  // Create the lead
  const lead = await prisma.lead.create({
    data: {
      name,
      email,
      phone,
      company,
      position,
      status: status || 'NEW',
      source,
      value,
      stage,
      assignedToId,
      customFields,
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  // Log activity
  await prisma.activity.create({
    data: {
      type: 'LEAD_CREATED',
      title: 'Lead created',
      description: `Lead "${name}" was created`,
      leadId: lead.id,
      userId: req.user!.userId,
      metadata: {
        source,
        status: lead.status,
      },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Lead created successfully',
    data: { lead },
  });
}

/**
 * Update a lead
 * PUT /api/leads/:id
 */
export async function updateLead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const updates = req.body;

  // Check if lead exists
  const existingLead = await prisma.lead.findUnique({
    where: { id },
  });

  if (!existingLead) {
    throw new NotFoundError('Lead not found');
  }

  // If updating email, check for conflicts
  if (updates.email && updates.email !== existingLead.email) {
    const emailExists = await prisma.lead.findUnique({
      where: { email: updates.email },
    });

    if (emailExists) {
      throw new ConflictError('A lead with this email already exists');
    }
  }

  // If updating assignedToId, verify user exists
  if (updates.assignedToId) {
    const assignedUser = await prisma.user.findUnique({
      where: { id: updates.assignedToId },
    });

    if (!assignedUser) {
      throw new ValidationError('Assigned user not found');
    }
  }

  // Update the lead
  const lead = await prisma.lead.update({
    where: { id },
    data: updates,
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
      tags: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
  });

  // Log activity for significant changes
  const activityData: any[] = [];

  if (updates.status && updates.status !== existingLead.status) {
    activityData.push({
      type: 'STATUS_CHANGED',
      title: 'Lead status changed',
      description: `Status changed from ${existingLead.status} to ${updates.status}`,
      leadId: lead.id,
      userId: req.user!.userId,
      metadata: {
        oldStatus: existingLead.status,
        newStatus: updates.status,
      },
    });
  }

  if (updates.stage && updates.stage !== existingLead.stage) {
    activityData.push({
      type: 'STAGE_CHANGED',
      title: 'Lead stage changed',
      description: `Stage changed from ${existingLead.stage || 'none'} to ${updates.stage}`,
      leadId: lead.id,
      userId: req.user!.userId,
      metadata: {
        oldStage: existingLead.stage,
        newStage: updates.stage,
      },
    });
  }

  if (updates.assignedToId && updates.assignedToId !== existingLead.assignedToId) {
    activityData.push({
      type: 'LEAD_ASSIGNED',
      title: 'Lead reassigned',
      description: `Lead assigned to ${lead.assignedTo?.firstName} ${lead.assignedTo?.lastName}`,
      leadId: lead.id,
      userId: req.user!.userId,
      metadata: {
        assignedToId: updates.assignedToId,
      },
    });
  }

  if (activityData.length > 0) {
    await prisma.activity.createMany({
      data: activityData,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Lead updated successfully',
    data: { lead },
  });
}

/**
 * Delete a lead
 * DELETE /api/leads/:id
 */
export async function deleteLead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  // Check if lead exists
  const lead = await prisma.lead.findUnique({
    where: { id },
  });

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  // Delete the lead (cascades to notes and activities)
  await prisma.lead.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: 'Lead deleted successfully',
  });
}

/**
 * Bulk delete leads
 * POST /api/leads/bulk-delete
 */
export async function bulkDeleteLeads(req: Request, res: Response): Promise<void> {
  const { leadIds } = req.body;

  const result = await prisma.lead.deleteMany({
    where: {
      id: {
        in: leadIds,
      },
    },
  });

  res.status(200).json({
    success: true,
    message: `${result.count} lead(s) deleted successfully`,
    data: {
      deletedCount: result.count,
    },
  });
}

/**
 * Bulk update leads
 * POST /api/leads/bulk-update
 */
export async function bulkUpdateLeads(req: Request, res: Response): Promise<void> {
  const { leadIds, updates } = req.body;

  const result = await prisma.lead.updateMany({
    where: {
      id: {
        in: leadIds,
      },
    },
    data: updates,
  });

  // Log activity for bulk updates
  if (updates.status || updates.assignedToId) {
    const activityType = updates.status ? 'STATUS_CHANGED' : 'LEAD_ASSIGNED';
    const title = updates.status ? 'Bulk status change' : 'Bulk assignment';
    const description = `${result.count} lead(s) updated`;

    await prisma.activity.create({
      data: {
        type: activityType,
        title,
        description,
        userId: req.user!.userId,
        metadata: {
          leadIds,
          updates,
          count: result.count,
        },
      },
    });
  }

  res.status(200).json({
    success: true,
    message: `${result.count} lead(s) updated successfully`,
    data: {
      updatedCount: result.count,
    },
  });
}

/**
 * Get lead statistics
 * GET /api/leads/stats
 */
export async function getLeadStats(req: Request, res: Response): Promise<void> {
  const { assignedToId } = req.query;

  const where: any = assignedToId ? { assignedToId: assignedToId as string } : {};

  const [
    total,
    statusCounts,
    avgScore,
    totalValue,
    recentLeads,
  ] = await Promise.all([
    // Total leads
    prisma.lead.count({ where }),
    
    // Count by status
    prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: true,
    }),
    
    // Average score
    prisma.lead.aggregate({
      where,
      _avg: {
        score: true,
      },
    }),
    
    // Total value
    prisma.lead.aggregate({
      where,
      _sum: {
        value: true,
      },
    }),
    
    // Recent leads (last 7 days)
    prisma.lead.count({
      where: {
        ...where,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  const stats = {
    total,
    byStatus: statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>),
    averageScore: avgScore._avg.score || 0,
    totalValue: totalValue._sum.value || 0,
    recentLeads,
  };

  res.status(200).json({
    success: true,
    data: { stats },
  });
}
