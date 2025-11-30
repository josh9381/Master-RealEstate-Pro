import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { NotFoundError, ValidationError } from '../middleware/errorHandler'

// Get all email templates
export const getEmailTemplates = async (req: Request, res: Response) => {
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
      { subject: { contains: search as string, mode: 'insensitive' } },
    ]
  }

  const templates = await prisma.emailTemplate.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    templates,
    total: templates.length,
  })
}

// Get single email template
export const getEmailTemplate = async (req: Request, res: Response) => {
  const { id } = req.params

  const template = await prisma.emailTemplate.findUnique({
    where: { id },
  })

  if (!template) {
    throw new NotFoundError('Email template not found')
  }

  res.json(template)
}

// Create email template
export const createEmailTemplate = async (req: Request, res: Response) => {
  const { name, subject, body, category, variables } = req.body

  if (!name || !subject || !body) {
    throw new ValidationError('Name, subject, and body are required')
  }

  const template = await prisma.emailTemplate.create({
    data: {
      name,
      subject,
      body,
      category,
      variables,
      organizationId: req.user!.organizationId
    },
  })

  res.status(201).json(template)
}

// Update email template
export const updateEmailTemplate = async (req: Request, res: Response) => {
  const { id } = req.params
  const { name, subject, body, category, isActive, variables } = req.body

  const existingTemplate = await prisma.emailTemplate.findUnique({
    where: { id },
  })

  if (!existingTemplate) {
    throw new NotFoundError('Email template not found')
  }

  const template = await prisma.emailTemplate.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(subject && { subject }),
      ...(body && { body }),
      ...(category !== undefined && { category }),
      ...(isActive !== undefined && { isActive }),
      ...(variables !== undefined && { variables }),
    },
  })

  res.json(template)
}

// Delete email template
export const deleteEmailTemplate = async (req: Request, res: Response) => {
  const { id } = req.params

  const existingTemplate = await prisma.emailTemplate.findUnique({
    where: { id },
  })

  if (!existingTemplate) {
    throw new NotFoundError('Email template not found')
  }

  await prisma.emailTemplate.delete({
    where: { id },
  })

  res.json({ message: 'Email template deleted successfully' })
}

// Use template (increment usage count)
export const useEmailTemplate = async (req: Request, res: Response) => {
  const { id } = req.params

  const template = await prisma.emailTemplate.findUnique({
    where: { id },
  })

  if (!template) {
    throw new NotFoundError('Email template not found')
  }

  const updatedTemplate = await prisma.emailTemplate.update({
    where: { id },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  })

  res.json(updatedTemplate)
}

// Get template usage stats
export const getEmailTemplateStats = async (req: Request, res: Response) => {
  const totalTemplates = await prisma.emailTemplate.count()
  const activeTemplates = await prisma.emailTemplate.count({
    where: { isActive: true },
  })

  const topTemplates = await prisma.emailTemplate.findMany({
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
