import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { NotFoundError, ValidationError } from '../middleware/errorHandler'

// Get all SMS templates
export const getSMSTemplates = async (req: Request, res: Response) => {
  const { category, isActive, search } = req.query

  const where: Record<string, unknown> = {}

  if (category) {
    where.category = category as string
  }

  if (isActive !== undefined) {
    where.isActive = isActive === 'true'
  }

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { body: { contains: search as string, mode: 'insensitive' } },
    ]
  }

  const templates = await prisma.sMSTemplate.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    templates,
    total: templates.length,
  })
}

// Get single SMS template
export const getSMSTemplate = async (req: Request, res: Response) => {
  const { id } = req.params

  const template = await prisma.sMSTemplate.findUnique({
    where: { id },
  })

  if (!template) {
    throw new NotFoundError('SMS template not found')
  }

  res.json(template)
}

// Create SMS template
export const createSMSTemplate = async (req: Request, res: Response) => {
  const { name, body, category, variables } = req.body

  if (!name || !body) {
    throw new ValidationError('Name and body are required')
  }

  // SMS character limit validation (160 chars for single SMS)
  if (body.length > 160) {
    throw new ValidationError('SMS body should not exceed 160 characters')
  }

  const template = await prisma.sMSTemplate.create({
    data: {
      name,
      body,
      category,
      variables,
      organizationId: req.user!.organizationId
    },
  })

  res.status(201).json(template)
}

// Update SMS template
export const updateSMSTemplate = async (req: Request, res: Response) => {
  const { id } = req.params
  const { name, body, category, isActive, variables } = req.body

  const existingTemplate = await prisma.sMSTemplate.findUnique({
    where: { id },
  })

  if (!existingTemplate) {
    throw new NotFoundError('SMS template not found')
  }

  // SMS character limit validation
  if (body && body.length > 160) {
    throw new ValidationError('SMS body should not exceed 160 characters')
  }

  const template = await prisma.sMSTemplate.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(body && { body }),
      ...(category !== undefined && { category }),
      ...(isActive !== undefined && { isActive }),
      ...(variables !== undefined && { variables }),
    },
  })

  res.json(template)
}

// Delete SMS template
export const deleteSMSTemplate = async (req: Request, res: Response) => {
  const { id } = req.params

  const existingTemplate = await prisma.sMSTemplate.findUnique({
    where: { id },
  })

  if (!existingTemplate) {
    throw new NotFoundError('SMS template not found')
  }

  await prisma.sMSTemplate.delete({
    where: { id },
  })

  res.json({ message: 'SMS template deleted successfully' })
}

// Use template (increment usage count)
export const useSMSTemplate = async (req: Request, res: Response) => {
  const { id } = req.params

  const template = await prisma.sMSTemplate.findUnique({
    where: { id },
  })

  if (!template) {
    throw new NotFoundError('SMS template not found')
  }

  const updatedTemplate = await prisma.sMSTemplate.update({
    where: { id },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  })

  res.json(updatedTemplate)
}

// Get template usage stats
export const getSMSTemplateStats = async (req: Request, res: Response) => {
  const totalTemplates = await prisma.sMSTemplate.count()
  const activeTemplates = await prisma.sMSTemplate.count({
    where: { isActive: true },
  })

  const topTemplates = await prisma.sMSTemplate.findMany({
    where: { isActive: true },
    orderBy: { usageCount: 'desc' },
    take: 5,
    select: {
      id: true,
      name: true,
      usageCount: true,
      lastUsedAt: true,
    },
  })

  res.json({
    totalTemplates,
    activeTemplates,
    inactiveTemplates: totalTemplates - activeTemplates,
    topTemplates,
  })
}
