import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, ConflictError, ValidationError } from '../middleware/errorHandler';

/**
 * Calculate character count for SMS (accounting for variables)
 */
function calculateSMSLength(text: string): { characters: number; segments: number } {
  const length = text.length;
  const segments = Math.ceil(length / 160);
  return { characters: length, segments };
}

/**
 * Get all SMS templates with filtering, pagination, and sorting
 * GET /api/sms-templates
 */
export async function getSMSTemplates(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery || req.query) as {
    page?: number;
    limit?: number;
    category?: string;
    isActive?: boolean;
    search?: string;
    sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount';
    sortOrder?: 'asc' | 'desc';
  };

  const {
    page = 1,
    limit = 20,
    category,
    isActive,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  // Build where clause
  const where: {
    category?: string;
    isActive?: boolean;
    OR?: Array<{ name?: { contains: string }; body?: { contains: string } }>;
  } = {};

  if (category) where.category = category;
  if (isActive !== undefined) where.isActive = isActive;

  // Search in name and body
  if (search) {
    where.OR = [
      { name: { contains: search as string } },
      { body: { contains: search as string } },
    ];
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Execute queries
  const [templates, total] = await Promise.all([
    prisma.sMSTemplate.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.sMSTemplate.count({ where }),
  ]);

  // Add character count to each template
  const templatesWithStats = templates.map(template => ({
    ...template,
    stats: calculateSMSLength(template.body),
  }));

  res.json({
    success: true,
    data: {
      templates: templatesWithStats,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    }
  });
}

/**
 * Get single SMS template by ID
 * GET /api/sms-templates/:id
 */
export async function getSMSTemplate(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const template = await prisma.sMSTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    throw new NotFoundError('SMS template not found');
  }

  // Add character count stats
  const templateWithStats = {
    ...template,
    stats: calculateSMSLength(template.body),
  };

  res.json({
    success: true,
    data: { template: templateWithStats }
  });
}

/**
 * Create a new SMS template
 * POST /api/sms-templates
 */
export async function createSMSTemplate(req: Request, res: Response): Promise<void> {
  const data = req.body;

  // Validate character count
  const { characters } = calculateSMSLength(data.body);
  if (characters > 1600) {
    throw new ValidationError('SMS body exceeds maximum length of 1600 characters (10 segments)');
  }

  // Check if template with same name exists
  const existingTemplate = await prisma.sMSTemplate.findFirst({
    where: { name: data.name },
  });

  if (existingTemplate) {
    throw new ConflictError('Template with this name already exists');
  }

  const template = await prisma.sMSTemplate.create({
    data: {
      name: data.name,
      body: data.body,
      category: data.category,
      isActive: data.isActive ?? true,
      variables: data.variables || {},
    },
  });

  // Add character count stats
  const templateWithStats = {
    ...template,
    stats: calculateSMSLength(template.body),
  };

  res.status(201).json({
    success: true,
    message: 'SMS template created successfully',
    data: { template: templateWithStats }
  });
}

/**
 * Update an SMS template
 * PUT /api/sms-templates/:id
 */
export async function updateSMSTemplate(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const data = req.body;

  // Check if template exists
  const existingTemplate = await prisma.sMSTemplate.findUnique({
    where: { id },
  });

  if (!existingTemplate) {
    throw new NotFoundError('SMS template not found');
  }

  // Validate character count if body is being updated
  if (data.body) {
    const { characters } = calculateSMSLength(data.body);
    if (characters > 1600) {
      throw new ValidationError('SMS body exceeds maximum length of 1600 characters (10 segments)');
    }
  }

  // Check if name is being changed and conflicts with another template
  if (data.name && data.name !== existingTemplate.name) {
    const nameConflict = await prisma.sMSTemplate.findFirst({
      where: { 
        name: data.name,
        id: { not: id },
      },
    });

    if (nameConflict) {
      throw new ConflictError('Template with this name already exists');
    }
  }

  const template = await prisma.sMSTemplate.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.body && { body: data.body }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.variables !== undefined && { variables: data.variables }),
    },
  });

  // Add character count stats
  const templateWithStats = {
    ...template,
    stats: calculateSMSLength(template.body),
  };

  res.json({
    success: true,
    message: 'SMS template updated successfully',
    data: { template: templateWithStats }
  });
}

/**
 * Delete an SMS template
 * DELETE /api/sms-templates/:id
 */
export async function deleteSMSTemplate(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  // Check if template exists
  const template = await prisma.sMSTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    throw new NotFoundError('SMS template not found');
  }

  await prisma.sMSTemplate.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'SMS template deleted successfully'
  });
}

/**
 * Duplicate an SMS template
 * POST /api/sms-templates/:id/duplicate
 */
export async function duplicateSMSTemplate(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  // Get original template
  const originalTemplate = await prisma.sMSTemplate.findUnique({
    where: { id },
  });

  if (!originalTemplate) {
    throw new NotFoundError('SMS template not found');
  }

  // Create copy with "(Copy)" suffix
  const copyName = `${originalTemplate.name} (Copy)`;
  
  const duplicatedTemplate = await prisma.sMSTemplate.create({
    data: {
      name: copyName,
      body: originalTemplate.body,
      category: originalTemplate.category,
      isActive: false, // New duplicates start as inactive
      variables: originalTemplate.variables || {},
    },
  });

  // Add character count stats
  const templateWithStats = {
    ...duplicatedTemplate,
    stats: calculateSMSLength(duplicatedTemplate.body),
  };

  res.status(201).json(templateWithStats);
}

/**
 * Get available template categories
 * GET /api/sms-templates/categories
 */
export async function getSMSTemplateCategories(req: Request, res: Response): Promise<void> {
  const categories = await prisma.sMSTemplate.findMany({
    where: {
      category: { not: null },
    },
    select: {
      category: true,
    },
    distinct: ['category'],
  });

  const categoryList = categories
    .map(t => t.category)
    .filter(Boolean)
    .sort();

  res.json({
    success: true,
    data: { categories: categoryList }
  });
}

/**
 * Preview SMS with character count and segment info
 * POST /api/sms-templates/preview
 */
export async function previewSMSTemplate(req: Request, res: Response): Promise<void> {
  const { body } = req.body;

  if (!body) {
    throw new ValidationError('Body is required for preview');
  }

  const stats = calculateSMSLength(body);
  
  res.json({
    body,
    characters: stats.characters,
    segments: stats.segments,
    cost: stats.segments * 0.0079, // Approximate cost per segment
    warnings: stats.segments > 5 ? ['Message will be sent as multiple SMS segments'] : [],
  });
}
