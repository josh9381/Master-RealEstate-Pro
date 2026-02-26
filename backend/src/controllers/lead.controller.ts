import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, ConflictError, ValidationError } from '../middleware/errorHandler';
import type { LeadStatus } from '@prisma/client';
import { workflowTriggerService } from '../services/workflow-trigger.service';
import { updateLeadScore, updateMultipleLeadScores, updateAllLeadScores, getScoreCategory, getLeadsByScoreCategory } from '../services/leadScoring.service';
import { getLeadsFilter, getRoleFilterFromRequest } from '../utils/roleFilters';
import { parse as csvParse } from 'csv-parse/sync';

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

  // Get role-based filter options
  const roleFilter = getRoleFilterFromRequest(req);
  
  // Build additional filters
  const additionalWhere: Record<string, unknown> = {};
  
  if (status) additionalWhere.status = status as LeadStatus;
  if (source) additionalWhere.source = source;
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
  const { firstName, lastName, email, phone, company, position, status, source, value, stage, assignedToId, customFields, notes, tags } = req.body;

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
        },
      });
    } catch (error) {
      console.error('Error creating initial note for lead:', error);
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
    console.error('Error creating activity:', error);
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
    console.error('Error triggering workflows for lead creation:', error);
    // Don't fail the lead creation if workflow trigger fails
  }

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
  const activityData: any[] = [];

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
      console.error('Error triggering workflows for status change:', error);
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
      console.error('Error triggering workflows for lead assignment:', error);
      // Don't fail the lead update if workflow trigger fails
    }
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
  const additionalWhere: Record<string, unknown> = {};
  
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
  const where: any = {};

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
  } catch (error: any) {
    console.error('Error counting filtered leads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to count filtered leads',
      error: error.message,
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
  } catch (error: any) {
    console.error('Error recalculating lead score:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to recalculate lead score',
        error: error.message,
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
  } catch (error: any) {
    console.error('Error batch recalculating scores:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to batch recalculate scores',
      error: error.message,
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
  } catch (error: any) {
    console.error('Error recalculating all scores:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate all scores',
      error: error.message,
    });
  }
}

/**
 * Import leads from CSV
 * POST /api/leads/import
 */
export async function importLeads(req: Request, res: Response): Promise<void> {
  const organizationId = req.user!.organizationId;
  const file = (req as any).file; // multer types

  if (!file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }

  const csv = file.buffer.toString('utf-8');

  // Parse CSV properly (handles quoted fields like "Smith, John")
  let records: Record<string, string>[];
  try {
    records = csvParse(csv, {
      columns: (header: string[]) => header.map((h: string) => h.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
    });
  } catch (parseErr: any) {
    res.status(400).json({ success: false, message: `CSV parse error: ${parseErr.message}` });
    return;
  }

  if (records.length === 0) {
    res.status(400).json({ success: false, message: 'CSV file is empty or has no data rows' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    try {
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

      // L5: Validate email format if provided
      if (leadData.email && !emailRegex.test(leadData.email)) {
        skipped++;
        errors.push(`Row ${i + 2}: Invalid email format "${leadData.email}"`);
        continue;
      }

      await prisma.lead.create({ data: leadData as any });
      imported++;
    } catch (err: any) {
      skipped++;
      errors.push(`Row ${i}: ${err.message}`);
    }
  }

  res.json({
    success: true,
    data: { imported, skipped, total: records.length, errors: errors.slice(0, 10) },
  });
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
  } catch (error: any) {
    console.error('Error getting leads by score category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leads by score category',
      error: error.message,
    });
  }
}
