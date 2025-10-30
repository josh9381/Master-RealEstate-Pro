import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, ConflictError } from '../middleware/errorHandler';

/**
 * Get all email templates with filtering, pagination, and sorting
 * GET /api/email-templates
 */
export async function getEmailTemplates(req: Request, res: Response): Promise<void> {
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
    OR?: Array<{ name?: { contains: string }; subject?: { contains: string } }>;
  } = {};

  if (category) where.category = category;
  if (isActive !== undefined) where.isActive = isActive;

  // Search in name and subject
  if (search) {
    where.OR = [
      { name: { contains: search as string } },
      { subject: { contains: search as string } },
    ];
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Execute queries
  const [templates, total] = await Promise.all([
    prisma.emailTemplate.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.emailTemplate.count({ where }),
  ]);

  res.json({
    templates,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  });
}

/**
 * Get single email template by ID
 * GET /api/email-templates/:id
 */
export async function getEmailTemplate(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const template = await prisma.emailTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    throw new NotFoundError('Email template not found');
  }

  res.json(template);
}

/**
 * Create a new email template
 * POST /api/email-templates
 */
export async function createEmailTemplate(req: Request, res: Response): Promise<void> {
  const data = req.body;

  // Check if template with same name exists
  const existingTemplate = await prisma.emailTemplate.findFirst({
    where: { name: data.name },
  });

  if (existingTemplate) {
    throw new ConflictError('Template with this name already exists');
  }

  const template = await prisma.emailTemplate.create({
    data: {
      name: data.name,
      subject: data.subject,
      body: data.body,
      category: data.category,
      isActive: data.isActive ?? true,
      variables: data.variables || {},
    },
  });

  res.status(201).json(template);
}

/**
 * Update an email template
 * PUT /api/email-templates/:id
 */
export async function updateEmailTemplate(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const data = req.body;

  // Check if template exists
  const existingTemplate = await prisma.emailTemplate.findUnique({
    where: { id },
  });

  if (!existingTemplate) {
    throw new NotFoundError('Email template not found');
  }

  // Check if name is being changed and conflicts with another template
  if (data.name && data.name !== existingTemplate.name) {
    const nameConflict = await prisma.emailTemplate.findFirst({
      where: { 
        name: data.name,
        id: { not: id },
      },
    });

    if (nameConflict) {
      throw new ConflictError('Template with this name already exists');
    }
  }

  const template = await prisma.emailTemplate.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.subject && { subject: data.subject }),
      ...(data.body && { body: data.body }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.variables !== undefined && { variables: data.variables }),
    },
  });

  res.json(template);
}

/**
 * Delete an email template
 * DELETE /api/email-templates/:id
 */
export async function deleteEmailTemplate(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  // Check if template exists
  const template = await prisma.emailTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    throw new NotFoundError('Email template not found');
  }

  await prisma.emailTemplate.delete({
    where: { id },
  });

  res.json({ message: 'Email template deleted successfully' });
}

/**
 * Duplicate an email template
 * POST /api/email-templates/:id/duplicate
 */
export async function duplicateEmailTemplate(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  // Get original template
  const originalTemplate = await prisma.emailTemplate.findUnique({
    where: { id },
  });

  if (!originalTemplate) {
    throw new NotFoundError('Email template not found');
  }

  // Create copy with "(Copy)" suffix
  const copyName = `${originalTemplate.name} (Copy)`;
  
  const duplicatedTemplate = await prisma.emailTemplate.create({
    data: {
      name: copyName,
      subject: originalTemplate.subject,
      body: originalTemplate.body,
      category: originalTemplate.category,
      isActive: false, // New duplicates start as inactive
      variables: originalTemplate.variables || {},
    },
  });

  res.status(201).json(duplicatedTemplate);
}

/**
 * Get available template categories
 * GET /api/email-templates/categories
 */
export async function getEmailTemplateCategories(req: Request, res: Response): Promise<void> {
  const categories = await prisma.emailTemplate.findMany({
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

  res.json({ categories: categoryList });
}
