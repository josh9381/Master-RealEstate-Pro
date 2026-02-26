import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, ConflictError, ValidationError } from '../middleware/errorHandler';

/**
 * Get all tags
 * GET /api/tags
 */
export const getTags = async (req: Request, res: Response) => {
  const tags = await prisma.tag.findMany({
    where: {
      organizationId: req.user!.organizationId  // CRITICAL: Filter by organization
    },
    orderBy: {
      name: 'asc',
    },
    include: {
      _count: {
        select: {
          leads: true,
          campaigns: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: {
      tags,
      total: tags.length,
    },
  });
};

/**
 * Get single tag by ID
 * GET /api/tags/:id
 */
export const getTag = async (req: Request, res: Response) => {
  const { id } = req.params;

  const tag = await prisma.tag.findFirst({
    where: { 
      id,
      organizationId: req.user!.organizationId  // CRITICAL: Verify ownership
    },
    include: {
      leads: {
        select: {
          id: true,
          firstName: true,
            lastName: true,
          email: true,
          status: true,
        },
      },
      campaigns: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      _count: {
        select: {
          leads: true,
          campaigns: true,
        },
      },
    },
  });

  if (!tag) {
    throw new NotFoundError( 'Tag not found');
  }

  res.json({
    success: true,
    data: { tag },
  });
};

/**
 * Create new tag
 * POST /api/tags
 */
export const createTag = async (req: Request, res: Response) => {
  const { name, color } = req.body;

  // Check if tag with same name already exists IN THIS ORGANIZATION
  const existingTag = await prisma.tag.findFirst({
    where: { 
      name,
      organizationId: req.user!.organizationId
    },
  });

  if (existingTag) {
    throw new ConflictError( 'A tag with this name already exists');
  }

  const tag = await prisma.tag.create({
    data: {
      organizationId: req.user!.organizationId,  // CRITICAL: Set organization
      name,
      color: color || null,
    },
  });

  res.status(201).json({
    success: true,
    data: { tag },
    message: 'Tag created successfully',
  });
};

/**
 * Update tag
 * PUT /api/tags/:id
 */
export const updateTag = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, color } = req.body;

  // Check if tag exists AND belongs to this organization
  const existingTag = await prisma.tag.findFirst({
    where: { 
      id,
      organizationId: req.user!.organizationId  // CRITICAL: Verify ownership
    },
  });

  if (!existingTag) {
    throw new NotFoundError( 'Tag not found');
  }

  // If updating name, check for duplicates IN THIS ORGANIZATION
  if (name && name !== existingTag.name) {
    const duplicateTag = await prisma.tag.findFirst({
      where: { 
        name,
        organizationId: req.user!.organizationId
      },
    });

    if (duplicateTag) {
      throw new ConflictError( 'A tag with this name already exists');
    }
  }

  const tag = await prisma.tag.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(color !== undefined && { color }),
    },
  });

  res.json({
    success: true,
    data: { tag },
    message: 'Tag updated successfully',
  });
};

/**
 * Delete tag
 * DELETE /api/tags/:id
 */
export const deleteTag = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if tag exists AND belongs to this organization
  const tag = await prisma.tag.findFirst({
    where: { 
      id,
      organizationId: req.user!.organizationId  // CRITICAL: Verify ownership
    },
    include: {
      _count: {
        select: {
          leads: true,
          campaigns: true,
        },
      },
    },
  });

  if (!tag) {
    throw new NotFoundError( 'Tag not found');
  }

  // Delete the tag (relations will be automatically disconnected due to implicit many-to-many)
  await prisma.tag.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Tag deleted successfully',
    data: {
      removedFromLeads: tag._count.leads,
      removedFromCampaigns: tag._count.campaigns,
    },
  });
};

/**
 * Add tags to a lead
 * POST /api/leads/:leadId/tags
 */
export const addTagsToLead = async (req: Request, res: Response) => {
  const { leadId } = req.params;
  const { tagIds } = req.body;

  // Check if lead exists AND belongs to this organization
  const lead = await prisma.lead.findFirst({
    where: { 
      id: leadId,
      organizationId: req.user!.organizationId  // CRITICAL: Verify ownership
    },
    include: {
      tags: true,
    },
  });

  if (!lead) {
    throw new NotFoundError( 'Lead not found');
  }

  // Verify all tags exist IN THIS ORGANIZATION
  const tags = await prisma.tag.findMany({
    where: {
      id: {
        in: tagIds,
      },
      organizationId: req.user!.organizationId  // CRITICAL: Only org's tags
    },
  });

  if (tags.length !== tagIds.length) {
    throw new ValidationError( 'One or more tag IDs are invalid');
  }

  // Get current tag IDs
  const currentTagIds = lead.tags.map(t => t.id);
  
  // Determine new tags to add (avoid duplicates)
  const newTagIds = tagIds.filter((tagId: string) => !currentTagIds.includes(tagId));

  if (newTagIds.length === 0) {
    return res.json({
      success: true,
      message: 'All tags already assigned to this lead',
      data: { lead },
    });
  }

  // Update lead with new tags
  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      tags: {
        connect: newTagIds.map((id: string) => ({ id })),
      },
    },
    include: {
      tags: true,
    },
  });

  res.json({
    success: true,
    data: { leads: updatedLead },
    message: `${newTagIds.length} tag(s) added to lead`,
  });
};

/**
 * Remove tag from lead
 * DELETE /api/leads/:leadId/tags/:tagId
 */
export const removeTagFromLead = async (req: Request, res: Response) => {
  const { leadId, tagId } = req.params;

  // Check if lead exists
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: req.user!.organizationId },
    include: {
      tags: true,
    },
  });

  if (!lead) {
    throw new NotFoundError( 'Lead not found');
  }

  // Check if tag is actually assigned to this lead
  const hasTag = lead.tags.some(t => t.id === tagId);

  if (!hasTag) {
    throw new ValidationError( 'This tag is not assigned to this lead');
  }

  // Remove the tag
  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      tags: {
        disconnect: { id: tagId },
      },
    },
    include: {
      tags: true,
    },
  });

  res.json({
    success: true,
    data: { leads: updatedLead },
    message: 'Tag removed from lead',
  });
};
