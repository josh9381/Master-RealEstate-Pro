import { getErrorMessage } from '../utils/errors'
import { logger } from '../lib/logger'
import { logActivity } from '../utils/activityLogger'
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, ConflictError, ValidationError } from '../middleware/errorHandler';
import type { LeadStatus, Prisma } from '@prisma/client';
import { workflowTriggerService } from '../services/workflow-trigger.service';
import { updateLeadScore, updateMultipleLeadScores, updateAllLeadScores, getScoreCategory, getLeadsByScoreCategory } from '../services/leadScoring.service';
import { getLeadsFilter, getRoleFilterFromRequest } from '../utils/roleFilters';
import { parse as csvParse } from 'csv-parse/sync';
import { pushLeadUpdate } from '../config/socket';
import {
  parseCSV,
  parseExcel,
  parseVCard,
  autoMapHeaders,
  detectDuplicates,
  executeImport,
  MAPPABLE_FIELDS,
} from '../services/import.service';
import type { ColumnMapping, DuplicateAction } from '../services/import.service';

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
    tags?: string;
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
    tags: tagsParam,
  } = query;

  // Get role-based filter options
  const roleFilter = getRoleFilterFromRequest(req);
  
  // Build additional filters
  const additionalWhere: Record<string, any> = {};
  
  if (status) {
    const statusStr = String(status);
    if (statusStr.includes(',')) {
      additionalWhere.status = { in: statusStr.split(',').map(s => s.trim()) as LeadStatus[] };
    } else {
      additionalWhere.status = status as LeadStatus;
    }
  }
  if (source) {
    const sourceStr = String(source);
    if (sourceStr.includes(',')) {
      additionalWhere.source = { in: sourceStr.split(',').map(s => s.trim()) };
    } else {
      additionalWhere.source = source;
    }
  }
  if (assignedToId) additionalWhere.assignedToId = assignedToId;
  
  // Score filtering
  if (minScore !== undefined || maxScore !== undefined) {
    const scoreFilter: Record<string, number> = {};
    if (minScore !== undefined) scoreFilter.gte = Number(minScore);
    if (maxScore !== undefined) scoreFilter.lte = Number(maxScore);
    additionalWhere.score = scoreFilter;
  }
  
  // Value filtering
  if (minValue !== undefined || maxValue !== undefined) {
    const valueFilter: Record<string, number> = {};
    if (minValue !== undefined) valueFilter.gte = Number(minValue);
    if (maxValue !== undefined) valueFilter.lte = Number(maxValue);
    additionalWhere.value = valueFilter;
  }

  // Tag filtering — comma-separated tag names
  if (tagsParam) {
    const tagNames = String(tagsParam).split(',').map(t => t.trim()).filter(Boolean);
    if (tagNames.length > 0) {
      additionalWhere.tags = {
        some: {
          name: { in: tagNames },
        },
      };
    }
  }

  // Search in firstName, lastName, email, company
  if (search) {
    additionalWhere.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
      { company: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  // Apply role-based filtering (ADMIN sees all, USER sees only assigned)
  const where = getLeadsFilter(roleFilter, additionalWhere);

  // Calculate pagination (guard against invalid values)
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(200, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;
  const take = limitNum;

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

  const lead = await prisma.lead.findFirst({
    where: { 
      id,
      organizationId: req.user!.organizationId  // CRITICAL: Verify lead belongs to user's org
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
  const { firstName, lastName, email, phone, company, position, status, source, value, stage, assignedToId, customFields, notes, tags,
    propertyType, transactionType, budgetMin, budgetMax, preApprovalStatus, moveInTimeline, desiredLocation, bedsMin, bathsMin } = req.body;

  // Check if email already exists within the organization (not globally)
  const existingLead = await prisma.lead.findFirst({
    where: { 
      email,
      organizationId: req.user!.organizationId  // Check within org only
    },
  });

  if (existingLead) {
    throw new ConflictError('A lead with this email already exists in your organization');
  }

  // If assignedToId is provided, verify the user exists and belongs to same org
  if (assignedToId) {
    const assignedUser = await prisma.user.findFirst({
      where: { 
        id: assignedToId,
        organizationId: req.user!.organizationId  // Verify same org
      },
    });

    if (!assignedUser) {
      throw new ValidationError('Assigned user not found in your organization');
    }
  }

  // Create the lead with organizationId
  const lead = await prisma.lead.create({
    data: {
      organizationId: req.user!.organizationId,  // CRITICAL: Set organization
      firstName,
      lastName,
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
      propertyType,
      transactionType,
      budgetMin: budgetMin ? parseFloat(budgetMin) : undefined,
      budgetMax: budgetMax ? parseFloat(budgetMax) : undefined,
      preApprovalStatus,
      moveInTimeline,
      desiredLocation,
      bedsMin: bedsMin ? parseInt(bedsMin) : undefined,
      bathsMin: bathsMin ? parseInt(bathsMin) : undefined,
      // Connect existing tags by name if provided
      ...(Array.isArray(tags) && tags.length > 0 ? {
        tags: {
          connectOrCreate: tags.map((tagName: string) => ({
            where: { 
              organizationId_name: { 
                organizationId: req.user!.organizationId, 
                name: tagName 
              } 
            },
            create: { 
              name: tagName, 
              organizationId: req.user!.organizationId 
            },
          })),
        },
      } : {}),
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
      tags: true,
    },
  });

  // Create initial note if provided
  if (notes && typeof notes === 'string' && notes.trim()) {
    try {
      await prisma.note.create({
        data: {
          content: notes.trim(),
          leadId: lead.id,
          authorId: req.user!.userId,
          organizationId: req.user!.organizationId,
        },
      });
    } catch (error) {
      logger.error('Error creating initial note for lead:', error);
      // Don't fail lead creation if note creation fails
    }
  }

  // Log activity
  try {
    await prisma.activity.create({
      data: {
        organizationId: req.user!.organizationId,  // Set organization
        type: 'LEAD_CREATED',
        title: 'Lead created',
        description: `Lead "${firstName} ${lastName}" was created`,
        leadId: lead.id,
        userId: req.user!.userId,
        metadata: {
          source,
          status: lead.status,
        },
      },
    });
  } catch (error) {
    logger.error('Error creating activity:', error);
    // Don't fail lead creation if activity logging fails
  }

  // Trigger workflows for LEAD_CREATED event
  try {
    await workflowTriggerService.detectTriggers({
      type: 'LEAD_CREATED',
      data: { lead },
      leadId: lead.id,
    });
  } catch (error) {
    logger.error('Error triggering workflows for lead creation:', error);
    // Don't fail the lead creation if workflow trigger fails
  }

  // Push real-time update
  pushLeadUpdate(req.user!.organizationId, { type: 'created', leadId: lead.id });

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

  // Check if lead exists and belongs to user's organization
  const existingLead = await prisma.lead.findFirst({
    where: { 
      id,
      organizationId: req.user!.organizationId  // Verify ownership
    },
  });

  if (!existingLead) {
    throw new NotFoundError('Lead not found');
  }

  // If updating email, check for conflicts within organization
  if (updates.email && updates.email !== existingLead.email) {
    const emailExists = await prisma.lead.findFirst({
      where: { 
        email: updates.email,
        organizationId: req.user!.organizationId  // Check within org
      },
    });

    if (emailExists) {
      throw new ConflictError('A lead with this email already exists in your organization');
    }
  }

  // If updating assignedToId, verify user exists in same org
  if (updates.assignedToId) {
    const assignedUser = await prisma.user.findFirst({
      where: { 
        id: updates.assignedToId,
        organizationId: req.user!.organizationId  // Same org
      },
    });

    if (!assignedUser) {
      throw new ValidationError('Assigned user not found in your organization');
    }
  }

  // Update the lead (organizationId cannot be changed)
  const { organizationId, ...safeUpdates } = updates;
  const lead = await prisma.lead.update({
    where: { id },
    data: safeUpdates,
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
  const activityData: Prisma.ActivityCreateManyInput[] = [];

  if (updates.status && updates.status !== existingLead.status) {
    activityData.push({
      organizationId: req.user!.organizationId,  // Set organization
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
      organizationId: req.user!.organizationId,  // Set organization
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
      organizationId: req.user!.organizationId,
      type: existingLead.assignedToId ? 'LEAD_REASSIGNED' : 'LEAD_ASSIGNED',
      title: existingLead.assignedToId ? 'Lead reassigned' : 'Lead assigned',
      description: `Lead assigned to ${lead.assignedTo?.firstName} ${lead.assignedTo?.lastName}`,
      leadId: lead.id,
      userId: req.user!.userId,
      metadata: {
        oldAssignedToId: existingLead.assignedToId,
        assignedToId: updates.assignedToId,
      },
    });
  }

  if (activityData.length > 0) {
    await prisma.activity.createMany({
      data: activityData,
    });
  }

  // Trigger workflows for status change
  if (updates.status && updates.status !== existingLead.status) {
    try {
      await workflowTriggerService.detectTriggers({
        type: 'LEAD_STATUS_CHANGED',
        data: {
          lead,
          oldStatus: existingLead.status,
          newStatus: updates.status,
        },
        leadId: lead.id,
      });
    } catch (error) {
      logger.error('Error triggering workflows for status change:', error);
      // Don't fail the lead update if workflow trigger fails
    }
  }

  // Trigger workflows for lead assignment
  if (updates.assignedToId && updates.assignedToId !== existingLead.assignedToId) {
    try {
      await workflowTriggerService.detectTriggers({
        type: 'LEAD_ASSIGNED',
        data: {
          lead,
          oldAssignedToId: existingLead.assignedToId,
          newAssignedToId: updates.assignedToId,
        },
        leadId: lead.id,
      });
    } catch (error) {
      logger.error('Error triggering workflows for lead assignment:', error);
      // Don't fail the lead update if workflow trigger fails
    }
  }

  pushLeadUpdate(req.user!.organizationId, { type: 'updated', leadId: lead.id });

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

  // Check if lead exists and belongs to user's organization
  const lead = await prisma.lead.findFirst({
    where: { 
      id,
      organizationId: req.user!.organizationId  // Verify ownership
    },
  });

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  // Delete the lead (cascades to notes and activities)
  await prisma.lead.delete({
    where: { id },
  });

  pushLeadUpdate(req.user!.organizationId, { type: 'deleted', leadId: id });

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

  // Only delete leads that belong to user's organization
  const result = await prisma.lead.deleteMany({
    where: {
      id: { in: leadIds },
      organizationId: req.user!.organizationId  // Safety check
    },
  });

  if (result.count > 0) {
    pushLeadUpdate(req.user!.organizationId, { type: 'deleted', count: result.count });
  }

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
      organizationId: req.user!.organizationId,
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
        organizationId: req.user!.organizationId,
        metadata: {
          leadIds,
          updates,
          count: result.count,
        } as any,
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

  // Get role-based filter
  const roleFilter = getRoleFilterFromRequest(req);
  const additionalWhere: Record<string, any> = {};
  
  if (assignedToId) {
    additionalWhere.assignedToId = assignedToId as string;
  }
  
  const where = getLeadsFilter(roleFilter, additionalWhere);

  const [
    total,
    statusCounts,
    avgScore,
    totalValue,
    recentLeads,
    sourceCounts,
    scoreHigh,
    scoreMedHigh,
    scoreMed,
    scoreMedLow,
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

    // Count by source (for charts)
    prisma.lead.groupBy({
      by: ['source'],
      where,
      _count: true,
    }),

    // Score distribution buckets
    prisma.lead.count({ where: { ...where, score: { gte: 91 } } }),
    prisma.lead.count({ where: { ...where, score: { gte: 81, lt: 91 } } }),
    prisma.lead.count({ where: { ...where, score: { gte: 71, lt: 81 } } }),
    prisma.lead.count({ where: { ...where, score: { gte: 60, lt: 71 } } }),
  ]);

  const scoreLow = total - scoreHigh - scoreMedHigh - scoreMed - scoreMedLow;

  const stats = {
    total,
    byStatus: statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>),
    averageScore: avgScore._avg.score || 0,
    totalValue: totalValue._sum.value || 0,
    recentLeads,
    bySource: sourceCounts.reduce((acc, curr) => {
      acc[curr.source ?? 'Unknown'] = curr._count;
      return acc;
    }, {} as Record<string, number>),
    scoreDistribution: [
      { range: '0-59', count: scoreLow },
      { range: '60-70', count: scoreMedLow },
      { range: '71-80', count: scoreMed },
      { range: '81-90', count: scoreMedHigh },
      { range: '91-100', count: scoreHigh },
    ],
  };

  res.status(200).json({
    success: true,
    data: { stats },
  });
}

/**
 * Count leads matching advanced filters
 * POST /api/leads/count-filtered
 */
export async function countFilteredLeads(req: Request, res: Response): Promise<void> {
  const { filters } = req.body as { filters: Array<{ field: string; operator: string; value: any }> };

  if (!filters || !Array.isArray(filters)) {
    res.status(400).json({
      success: false,
      message: 'Filters array is required',
    });
    return;
  }

  // Build where clause from filters
  const where: Record<string, any> = {};

  filters.forEach((filter) => {
    const { field, operator, value } = filter;

    // Handle nested fields (e.g., customFields.industry)
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      
      if (parent === 'customFields') {
        if (!where[parent]) where[parent] = {};
        
        switch (operator) {
          case 'equals':
            where[parent].path = ['$', child];
            where[parent].equals = value;
            break;
          case 'contains':
            // For JSON fields, we need to use string_contains
            where[parent].path = ['$', child];
            where[parent].string_contains = value;
            break;
          case 'greaterThan':
            where[parent].path = ['$', child];
            where[parent].gt = value;
            break;
          case 'lessThan':
            where[parent].path = ['$', child];
            where[parent].lt = value;
            break;
        }
      }
    } else {
      // Handle regular fields
      switch (operator) {
        case 'equals':
          where[field] = value;
          break;
        case 'notEquals':
          where[field] = { not: value };
          break;
        case 'contains':
          where[field] = { contains: value };
          break;
        case 'startsWith':
          where[field] = { startsWith: value };
          break;
        case 'endsWith':
          where[field] = { endsWith: value };
          break;
        case 'greaterThan':
          where[field] = { gt: Number(value) };
          break;
        case 'lessThan':
          where[field] = { lt: Number(value) };
          break;
        case 'greaterThanOrEqual':
          where[field] = { gte: Number(value) };
          break;
        case 'lessThanOrEqual':
          where[field] = { lte: Number(value) };
          break;
        case 'before':
          where[field] = { lt: new Date(value) };
          break;
        case 'after':
          where[field] = { gt: new Date(value) };
          break;
        case 'lastNDays':
          where[field] = {
            gte: new Date(Date.now() - Number(value) * 24 * 60 * 60 * 1000),
          };
          break;
        case 'includes':
          // For tags array
          if (field === 'tags') {
            where.tags = {
              some: {
                name: { contains: value },
              },
            };
          }
          break;
        case 'excludes':
          // For tags array
          if (field === 'tags') {
            where.tags = {
              none: {
                name: { contains: value },
              },
            };
          }
          break;
      }
    }
  });

  try {
    // Count leads matching the filters
    const count = await prisma.lead.count({ where });

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error: unknown) {
    logger.error('Error counting filtered leads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to count filtered leads',
      error: getErrorMessage(error),
    });
  }
}

/**
 * Recalculate score for a single lead
 * POST /api/leads/:id/score
 */
export async function recalculateLeadScore(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const score = await updateLeadScore(id);
    const category = getScoreCategory(score);

    res.status(200).json({
      success: true,
      data: { score, category },
      message: 'Lead score updated successfully',
    });
  } catch (error: unknown) {
    logger.error('Error recalculating lead score:', error);
    if (getErrorMessage(error).includes('not found')) {
      res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to recalculate lead score',
        error: getErrorMessage(error),
      });
    }
  }
}

/**
 * Batch recalculate scores for multiple leads
 * POST /api/leads/scores/batch
 */
export async function batchRecalculateScores(req: Request, res: Response): Promise<void> {
  const { leadIds } = req.body as { leadIds: string[] };

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    res.status(400).json({
      success: false,
      message: 'leadIds must be a non-empty array',
    });
    return;
  }

  try {
    await updateMultipleLeadScores(leadIds);

    res.status(200).json({
      success: true,
      message: `Successfully updated scores for ${leadIds.length} leads`,
    });
  } catch (error: unknown) {
    logger.error('Error batch recalculating scores:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to batch recalculate scores',
      error: getErrorMessage(error),
    });
  }
}

/**
 * Recalculate scores for all leads
 * POST /api/leads/scores/all
 */
export async function recalculateAllScores(req: Request, res: Response): Promise<void> {
  try {
    const result = await updateAllLeadScores();

    res.status(200).json({
      success: true,
      data: result,
      message: `Updated ${result.updated} leads, ${result.errors} errors`,
    });
  } catch (error: unknown) {
    logger.error('Error recalculating all scores:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate all scores',
      error: getErrorMessage(error),
    });
  }
}

/**
 * Import leads from CSV (legacy endpoint — still works for simple CSV uploads)
 * POST /api/leads/import
 */
export async function importLeads(req: Request, res: Response): Promise<void> {
  const organizationId = req.user!.organizationId;
  const file = (req as any).file; // multer types

  if (!file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }

  // Check if this is an enhanced import (with column mappings)
  const bodyMappings = req.body?.columnMappings;
  const bodyAction = req.body?.duplicateAction;

  if (bodyMappings) {
    // Enhanced import with column mappings
    try {
      const ext = file.originalname?.toLowerCase() || '';
      let parsed;
      if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
        parsed = await parseExcel(file.buffer);
      } else if (ext.endsWith('.vcf')) {
        parsed = parseVCard(file.buffer);
      } else {
        parsed = parseCSV(file.buffer);
      }

      if (parsed.rows.length === 0) {
        res.status(400).json({ success: false, message: 'File is empty or has no data rows' });
        return;
      }

      let mappings: ColumnMapping[];
      try {
        mappings = typeof bodyMappings === 'string' ? JSON.parse(bodyMappings) : bodyMappings;
      } catch {
        res.status(400).json({ success: false, message: 'Invalid columnMappings format' });
        return;
      }

      const duplicateAction: DuplicateAction = (['skip', 'overwrite', 'create'].includes(bodyAction) ? bodyAction : 'skip') as DuplicateAction;

      const result = await executeImport(parsed.rows, {
        organizationId,
        userId: req.user!.userId,
        columnMappings: mappings,
        duplicateAction,
      });

      pushLeadUpdate(organizationId, { type: 'imported', count: result.imported });

      res.json({ success: true, data: result });
      return;
    } catch (err: unknown) {
      res.status(500).json({ success: false, message: `Import failed: ${getErrorMessage(err)}` });
      return;
    }
  }

  // Legacy CSV-only import (no column mapping)
  const csv = file.buffer.toString('utf-8');

  let records: Record<string, string>[];
  try {
    records = csvParse(csv, {
      columns: (header: string[]) => header.map((h: string) => h.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
    });
  } catch (parseErr: unknown) {
    res.status(400).json({ success: false, message: `CSV parse error: ${getErrorMessage(parseErr)}` });
    return;
  }

  if (records.length === 0) {
    res.status(400).json({ success: false, message: 'CSV file is empty or has no data rows' });
    return;
  }

  // Enforce max row limit to prevent OOM and gateway timeouts
  const MAX_IMPORT_ROWS = parseInt(process.env.MAX_IMPORT_ROWS || '10000', 10);
  if (records.length > MAX_IMPORT_ROWS) {
    res.status(400).json({
      success: false,
      message: `Import exceeds maximum of ${MAX_IMPORT_ROWS.toLocaleString()} rows. Your file has ${records.length.toLocaleString()} rows. Please split into smaller files.`,
    });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Process imports in batches for better DB performance
  const BATCH_SIZE = 500;
  const validLeads: any[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];

    const leadData = {
      firstName: row['first name'] || row['firstname'] || row['first_name'] || row['name']?.split(' ')[0] || '',
      lastName: row['last name'] || row['lastname'] || row['last_name'] || row['name']?.split(' ').slice(1).join(' ') || '',
      email: row['email'] || '',
      phone: row['phone'] || row['phone number'] || row['phonenumber'] || '',
      source: row['source'] || 'IMPORT',
      status: 'NEW' as const,
      organizationId,
      assignedToId: req.user!.userId,
    };

    if (!leadData.firstName && !leadData.email) {
      skipped++;
      errors.push(`Row ${i + 2}: Missing name and email`);
      continue;
    }

    if (leadData.email && !emailRegex.test(leadData.email)) {
      skipped++;
      errors.push(`Row ${i + 2}: Invalid email format "${leadData.email}"`);
      continue;
    }

    validLeads.push(leadData);
  }

  // Batch insert valid leads using createMany for performance
  for (let batch = 0; batch < validLeads.length; batch += BATCH_SIZE) {
    const chunk = validLeads.slice(batch, batch + BATCH_SIZE);
    try {
      const result = await prisma.lead.createMany({
        data: chunk as any,
        skipDuplicates: true,
      });
      imported += result.count;
    } catch (err: unknown) {
      // Fall back to individual creates for this batch so partial failures are captured
      for (const leadData of chunk) {
        try {
          await prisma.lead.create({ data: leadData as any });
          imported++;
        } catch (innerErr: unknown) {
          skipped++;
          errors.push(`Row: ${getErrorMessage(innerErr)}`);
        }
      }
    }
  }

  if (imported > 0) {
    pushLeadUpdate(organizationId, { type: 'imported', count: imported });
    logActivity({
      type: 'LEAD_IMPORTED',
      title: 'Leads imported',
      description: `${imported} leads imported from file (${skipped} skipped)`,
      userId: req.user!.userId,
      organizationId,
      metadata: { imported, skipped, total: records.length },
    });
  }

  res.json({
    success: true,
    data: { imported, skipped, total: records.length, errors: errors.slice(0, 10) },
  });
}

/**
 * Preview an import file — parse headers + first N rows, return auto-mapped columns
 * POST /api/leads/import/preview
 */
export async function previewImport(req: Request, res: Response): Promise<void> {
  const file = (req as any).file;

  if (!file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }

  try {
    const ext = (file.originalname || '').toLowerCase();
    let parsed;

    if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
      parsed = await parseExcel(file.buffer);
    } else if (ext.endsWith('.vcf')) {
      parsed = parseVCard(file.buffer);
    } else {
      parsed = parseCSV(file.buffer);
    }

    if (parsed.headers.length === 0) {
      res.status(400).json({ success: false, message: 'File has no headers or is empty' });
      return;
    }

    // Auto-map headers to lead fields
    const suggestedMappings = autoMapHeaders(parsed.headers);

    // Return preview (first 5 rows)
    res.json({
      success: true,
      data: {
        headers: parsed.headers,
        previewRows: parsed.rows.slice(0, 5),
        totalRows: parsed.totalRows,
        fileType: parsed.fileType,
        suggestedMappings,
        mappableFields: MAPPABLE_FIELDS,
      },
    });
  } catch (err: unknown) {
    res.status(400).json({ success: false, message: `Failed to parse file: ${getErrorMessage(err)}` });
  }
}

/**
 * Detect duplicates in an uploaded file before importing
 * POST /api/leads/import/duplicates
 */
export async function checkImportDuplicates(req: Request, res: Response): Promise<void> {
  const organizationId = req.user!.organizationId;
  const file = (req as any).file;

  if (!file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }

  let bodyMappings = req.body?.columnMappings;

  try {
    const ext = (file.originalname || '').toLowerCase();
    let parsed;

    if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
      parsed = await parseExcel(file.buffer);
    } else if (ext.endsWith('.vcf')) {
      parsed = parseVCard(file.buffer);
    } else {
      parsed = parseCSV(file.buffer);
    }

    let mappings: ColumnMapping[];
    try {
      mappings = typeof bodyMappings === 'string' ? JSON.parse(bodyMappings) : bodyMappings;
    } catch {
      res.status(400).json({ success: false, message: 'Invalid columnMappings format' });
      return;
    }

    const duplicates = await detectDuplicates(parsed.rows, mappings, organizationId);

    res.json({
      success: true,
      data: {
        totalRows: parsed.totalRows,
        duplicatesFound: duplicates.length,
        duplicates: duplicates.slice(0, 50), // Limit to first 50
      },
    });
  } catch (err: unknown) {
    res.status(500).json({ success: false, message: `Duplicate check failed: ${getErrorMessage(err)}` });
  }
}

/**
 * Get leads by score category
 * GET /api/leads/scores/:category
 */
export async function getLeadsByScore(req: Request, res: Response): Promise<void> {
  const { category } = req.params;

  const validCategories = ['HOT', 'WARM', 'COOL', 'COLD'];
  if (!validCategories.includes(category.toUpperCase())) {
    res.status(400).json({
      success: false,
      message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
    });
    return;
  }

  try {
    const leads = await getLeadsByScoreCategory(category.toUpperCase() as 'HOT' | 'WARM' | 'COOL' | 'COLD');

    res.status(200).json({
      success: true,
      data: leads,
      count: leads.length,
    });
  } catch (error: unknown) {
    logger.error('Error getting leads by score category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leads by score category',
      error: getErrorMessage(error),
    });
  }
}

/**
 * Scan for duplicate leads within the organization (server-side)
 * POST /api/leads/duplicates/scan
 *
 * Accepts query config:
 * - matchEmail: boolean (default true)
 * - matchPhone: boolean (default true)
 * - matchName: boolean (default true)
 * - threshold: number (minimum similarity %, default 80)
 */
export async function scanDuplicates(req: Request, res: Response): Promise<void> {
  const orgId = req.user!.organizationId;
  const { matchEmail = true, matchPhone = true, matchName = true } = req.body;

  const leads = await prisma.lead.findMany({
    where: { organizationId: orgId },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true,
      company: true, position: true, source: true, score: true, status: true, value: true,
      propertyType: true, transactionType: true, budgetMin: true, budgetMax: true,
      preApprovalStatus: true, moveInTimeline: true, desiredLocation: true, bedsMin: true, bathsMin: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  interface DupPair {
    lead1: typeof leads[0];
    lead2: typeof leads[0];
    similarity: number;
    reason: string;
  }

  const pairs: DupPair[] = [];
  const seen = new Set<string>();

  const pairKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`;

  // Email matching
  if (matchEmail) {
    const emailMap = new Map<string, typeof leads[0]>();
    for (const lead of leads) {
      const email = lead.email?.toLowerCase();
      if (!email) continue;
      const existing = emailMap.get(email);
      if (existing) {
        const k = pairKey(existing.id, lead.id);
        if (!seen.has(k)) {
          seen.add(k);
          pairs.push({ lead1: existing, lead2: lead, similarity: 95, reason: 'Same email address' });
        }
      } else {
        emailMap.set(email, lead);
      }
    }
  }

  // Phone matching
  if (matchPhone) {
    const phoneMap = new Map<string, typeof leads[0]>();
    for (const lead of leads) {
      const phone = lead.phone?.replace(/\D/g, '');
      if (!phone || phone.length < 10) continue;
      const existing = phoneMap.get(phone);
      if (existing) {
        const k = pairKey(existing.id, lead.id);
        if (!seen.has(k)) {
          seen.add(k);
          pairs.push({ lead1: existing, lead2: lead, similarity: 90, reason: 'Same phone number' });
        }
      } else {
        phoneMap.set(phone, lead);
      }
    }
  }

  // Name matching
  if (matchName) {
    const nameMap = new Map<string, typeof leads[0]>();
    for (const lead of leads) {
      const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim().toLowerCase();
      if (fullName.length <= 1) continue;
      const existing = nameMap.get(fullName);
      if (existing) {
        const k = pairKey(existing.id, lead.id);
        if (!seen.has(k)) {
          seen.add(k);
          pairs.push({ lead1: existing, lead2: lead, similarity: 80, reason: 'Same full name' });
        }
      } else {
        nameMap.set(fullName, lead);
      }
    }
  }

  res.json({
    success: true,
    data: {
      duplicates: pairs,
      totalLeadsScanned: leads.length,
      duplicatesFound: pairs.length,
    },
  });
}

/**
 * Merge leads with field-level resolution
 * POST /api/leads/merge
 *
 * Accepts:
 * - primaryLeadId: the lead to keep
 * - secondaryLeadIds: leads to merge into primary (then delete)
 * - fieldSelections: { fieldName: 'primary' | 'secondary' } — which lead's value to keep per field
 */
export async function mergeLeads(req: Request, res: Response): Promise<void> {
  const { primaryLeadId, secondaryLeadIds, fieldSelections } = req.body;
  const orgId = req.user!.organizationId;

  try {
    // Verify all leads belong to the org
    const allIds = [primaryLeadId, ...secondaryLeadIds];
    const leads = await prisma.lead.findMany({
      where: { id: { in: allIds }, organizationId: orgId },
      include: { tags: true },
    });

    if (leads.length !== allIds.length) {
      res.status(400).json({ success: false, message: 'One or more leads not found in your organization' });
      return;
    }

    const primaryLead = leads.find(l => l.id === primaryLeadId)!;
    const secondaryLeads = leads.filter(l => l.id !== primaryLeadId);

    // Build field updates from field selections
    const mergeableFields = ['firstName', 'lastName', 'email', 'phone', 'company', 'position', 'source', 'value', 'stage', 'score', 'status'] as const;
    const updateData: Record<string, any> = {};

    if (fieldSelections && typeof fieldSelections === 'object') {
      for (const field of mergeableFields) {
        const selection = fieldSelections[field];
        if (selection === 'secondary' && secondaryLeads.length > 0) {
          // Use the first secondary lead's value
          const secValue = (secondaryLeads[0] as any)[field];
          if (secValue !== undefined && secValue !== null) {
            updateData[field] = secValue;
          }
        }
        // 'primary' = keep current value (no update needed)
      }
    }

    // Merge tags (collect unique tags from all leads)
    const allTagIds = new Set<string>();
    for (const lead of leads) {
      for (const tag of (lead as any).tags || []) {
        allTagIds.add(tag.id);
      }
    }

    // Execute merge in a transaction
    await prisma.$transaction([
      // Transfer all related records to primary lead
      prisma.note.updateMany({ where: { leadId: { in: secondaryLeadIds } }, data: { leadId: primaryLeadId } }),
      prisma.task.updateMany({ where: { leadId: { in: secondaryLeadIds } }, data: { leadId: primaryLeadId } }),
      prisma.activity.updateMany({ where: { leadId: { in: secondaryLeadIds } }, data: { leadId: primaryLeadId } }),
      prisma.message.updateMany({ where: { leadId: { in: secondaryLeadIds } }, data: { leadId: primaryLeadId } }),
      prisma.appointment.updateMany({ where: { leadId: { in: secondaryLeadIds } }, data: { leadId: primaryLeadId } }),
      prisma.call.updateMany({ where: { leadId: { in: secondaryLeadIds } }, data: { leadId: primaryLeadId } }),
      prisma.followUpReminder.updateMany({ where: { leadId: { in: secondaryLeadIds } }, data: { leadId: primaryLeadId } }),
      prisma.workflowExecution.updateMany({ where: { leadId: { in: secondaryLeadIds } }, data: { leadId: primaryLeadId } }),
      // CampaignLead — can't just reassign because of unique constraints. Delete secondary ones.
      prisma.campaignLead.deleteMany({ where: { leadId: { in: secondaryLeadIds } } }),
      // ABTestResult — delete secondary ones
      prisma.aBTestResult.deleteMany({ where: { leadId: { in: secondaryLeadIds } } }),
      // Update primary lead fields if field selections provided
      ...(Object.keys(updateData).length > 0
        ? [prisma.lead.update({ where: { id: primaryLeadId }, data: updateData })]
        : []),
      // Delete secondary leads (cascade will handle remaining)
      prisma.lead.deleteMany({ where: { id: { in: secondaryLeadIds } } }),
    ]);

    // Reconnect merged tags to primary lead
    if (allTagIds.size > 0) {
      await prisma.lead.update({
        where: { id: primaryLeadId },
        data: {
          tags: {
            set: Array.from(allTagIds).map(id => ({ id })),
          },
        },
      });
    }

    // Return updated primary lead
    const merged = await prisma.lead.findUnique({
      where: { id: primaryLeadId },
      include: {
        tags: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        pipeline: { select: { id: true, name: true } },
        pipelineStage: { select: { id: true, name: true } },
      },
    });

    // Log merge activity
    logActivity({
      type: 'LEAD_MERGED',
      title: 'Leads merged',
      description: `${secondaryLeadIds.length} lead(s) merged into ${primaryLead.firstName} ${primaryLead.lastName}`,
      leadId: primaryLeadId,
      userId: req.user!.userId,
      organizationId: orgId,
      metadata: { secondaryLeadIds, fieldsUpdated: Object.keys(updateData) },
    });

    res.json({ success: true, data: merged });
  } catch (error: unknown) {
    logger.error('Error merging leads:', error);
    res.status(500).json({ success: false, message: `Merge failed: ${getErrorMessage(error)}` });
  }
}