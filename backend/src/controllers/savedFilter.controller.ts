import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import type { SegmentRule } from '../services/segmentation.service'

const prisma = new PrismaClient()

/**
 * Convert SavedFilterView filterConfig to SegmentRule[] format.
 * This enables sharing buildWhereFromRules() between saved views and segments.
 */
export function filterConfigToSegmentRules(config: any): SegmentRule[] {
  const rules: SegmentRule[] = []

  if (config.status?.length > 0) {
    rules.push({ field: 'status', operator: 'in', value: config.status })
  }
  if (config.source?.length > 0) {
    rules.push({ field: 'source', operator: 'in', value: config.source })
  }
  if (config.scoreRange) {
    const [min, max] = config.scoreRange
    if (min > 0 || max < 100) {
      rules.push({ field: 'score', operator: 'between', value: { min, max } })
    }
  }
  if (config.dateRange?.from) {
    rules.push({ field: 'createdAt', operator: 'greaterThanOrEqual', value: config.dateRange.from })
  }
  if (config.dateRange?.to) {
    rules.push({ field: 'createdAt', operator: 'lessThanOrEqual', value: config.dateRange.to })
  }
  if (config.tags?.length > 0) {
    rules.push({ field: 'tags', operator: 'includesAny', value: config.tags })
  }
  if (config.assignedTo?.length > 0) {
    rules.push({ field: 'assignedToId', operator: 'in', value: config.assignedTo })
  }

  return rules
}

const createFilterViewSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  filterConfig: z.object({
    status: z.array(z.string()).optional(),
    source: z.array(z.string()).optional(),
    scoreRange: z.tuple([z.number(), z.number()]).optional(),
    dateRange: z.object({ from: z.string(), to: z.string() }).optional(),
    tags: z.array(z.string()).optional(),
    assignedTo: z.array(z.string()).optional(),
  }),
  scoreFilter: z.string().default('ALL'),
  sortField: z.string().optional(),
  sortDirection: z.string().optional(),
  isDefault: z.boolean().default(false),
  isShared: z.boolean().default(false),
})

const updateFilterViewSchema = createFilterViewSchema.partial()

// GET /api/saved-filters
export const getSavedFilterViews = async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  const organizationId = (req as any).user.organizationId

  const views = await prisma.savedFilterView.findMany({
    where: {
      OR: [
        { userId, organizationId },
        { isShared: true, organizationId },
      ],
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })

  res.json({ success: true, data: views })
}

// POST /api/saved-filters
export const createSavedFilterView = async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  const organizationId = (req as any).user.organizationId

  const parsed = createFilterViewSchema.parse(req.body)

  // If this is set as default, unset any existing default
  if (parsed.isDefault) {
    await prisma.savedFilterView.updateMany({
      where: { userId, organizationId, isDefault: true },
      data: { isDefault: false },
    })
  }

  const view = await prisma.savedFilterView.create({
    data: {
      ...parsed,
      filterConfig: parsed.filterConfig as any,
      userId,
      organizationId,
    },
  })

  res.status(201).json({ success: true, data: view })
}

// PATCH /api/saved-filters/:id
export const updateSavedFilterView = async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  const organizationId = (req as any).user.organizationId
  const { id } = req.params

  const existing = await prisma.savedFilterView.findFirst({
    where: { id, userId, organizationId },
  })

  if (!existing) {
    return res.status(404).json({ success: false, error: 'Filter view not found' })
  }

  const parsed = updateFilterViewSchema.parse(req.body)

  // If setting as default, unset any existing default
  if (parsed.isDefault) {
    await prisma.savedFilterView.updateMany({
      where: { userId, organizationId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    })
  }

  const view = await prisma.savedFilterView.update({
    where: { id },
    data: {
      ...parsed,
      filterConfig: parsed.filterConfig ? (parsed.filterConfig as any) : undefined,
    },
  })

  res.json({ success: true, data: view })
}

// DELETE /api/saved-filters/:id
export const deleteSavedFilterView = async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  const organizationId = (req as any).user.organizationId
  const { id } = req.params

  const existing = await prisma.savedFilterView.findFirst({
    where: { id, userId, organizationId },
  })

  if (!existing) {
    return res.status(404).json({ success: false, error: 'Filter view not found' })
  }

  await prisma.savedFilterView.delete({ where: { id } })

  res.json({ success: true, message: 'Filter view deleted' })
}
