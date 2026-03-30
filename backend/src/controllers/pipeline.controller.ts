import { Request, Response } from 'express'
import { PipelineType } from '@prisma/client'
import { prisma } from '../config/database'

// Default stages per pipeline type
const DEFAULT_PIPELINE_STAGES: Record<string, Array<{ name: string; order: number; color: string; isWinStage?: boolean; isLostStage?: boolean }>> = {
  DEFAULT: [
    { name: 'New', order: 1, color: '#6B7280' },
    { name: 'Contacted', order: 2, color: '#3B82F6' },
    { name: 'Nurturing', order: 3, color: '#06B6D4' },
    { name: 'Qualified', order: 4, color: '#8B5CF6' },
    { name: 'Proposal', order: 5, color: '#F59E0B' },
    { name: 'Negotiation', order: 6, color: '#EF4444' },
    { name: 'Closed Won', order: 7, color: '#10B981', isWinStage: true },
    { name: 'Closed Lost', order: 8, color: '#6B7280', isLostStage: true },
  ],
  BUYER: [
    { name: 'New Lead', order: 1, color: '#6B7280' },
    { name: 'Initial Contact', order: 2, color: '#3B82F6' },
    { name: 'Nurturing', order: 3, color: '#06B6D4' },
    { name: 'Pre-Approved', order: 4, color: '#8B5CF6' },
    { name: 'Showing', order: 5, color: '#F59E0B' },
    { name: 'Offer Made', order: 6, color: '#EF4444' },
    { name: 'Under Contract', order: 7, color: '#EC4899' },
    { name: 'Closed Won', order: 8, color: '#10B981', isWinStage: true },
    { name: 'Closed Lost', order: 9, color: '#6B7280', isLostStage: true },
  ],
  SELLER: [
    { name: 'New Listing', order: 1, color: '#6B7280' },
    { name: 'Listing Agreement', order: 2, color: '#3B82F6' },
    { name: 'Active Marketing', order: 3, color: '#8B5CF6' },
    { name: 'Showing', order: 4, color: '#F59E0B' },
    { name: 'Offer Received', order: 5, color: '#EF4444' },
    { name: 'Under Contract', order: 6, color: '#EC4899' },
    { name: 'Closed Won', order: 7, color: '#10B981', isWinStage: true },
    { name: 'Withdrawn', order: 8, color: '#6B7280', isLostStage: true },
  ],
  RENTAL: [
    { name: 'Inquiry', order: 1, color: '#6B7280' },
    { name: 'Showing Scheduled', order: 2, color: '#3B82F6' },
    { name: 'Application', order: 3, color: '#8B5CF6' },
    { name: 'Screening', order: 4, color: '#F59E0B' },
    { name: 'Lease Signing', order: 5, color: '#EC4899' },
    { name: 'Moved In', order: 6, color: '#10B981', isWinStage: true },
    { name: 'Declined', order: 7, color: '#6B7280', isLostStage: true },
  ],
  COMMERCIAL: [
    { name: 'Prospect', order: 1, color: '#6B7280' },
    { name: 'Initial Meeting', order: 2, color: '#3B82F6' },
    { name: 'Nurturing', order: 3, color: '#06B6D4' },
    { name: 'Needs Analysis', order: 4, color: '#8B5CF6' },
    { name: 'Site Tour', order: 5, color: '#F59E0B' },
    { name: 'Proposal', order: 6, color: '#EF4444' },
    { name: 'Negotiation', order: 7, color: '#EC4899' },
    { name: 'Under Contract', order: 8, color: '#F97316' },
    { name: 'Closed Won', order: 9, color: '#10B981', isWinStage: true },
    { name: 'Closed Lost', order: 10, color: '#6B7280', isLostStage: true },
  ],
}

const PIPELINE_TYPE_NAMES: Record<string, string> = {
  DEFAULT: 'General Pipeline',
  BUYER: 'Buyer Pipeline',
  SELLER: 'Seller Pipeline',
  RENTAL: 'Rental Pipeline',
  COMMERCIAL: 'Commercial Pipeline',
  CUSTOM: 'Custom Pipeline',
}

// Initialize default pipelines for an organization
export async function seedDefaultPipelines(organizationId: string) {
  const existing = await prisma.pipeline.findMany({ where: { organizationId } })
  if (existing.length > 0) return existing

  const pipelines = []
  for (const [type, stages] of Object.entries(DEFAULT_PIPELINE_STAGES)) {
    const pipeline = await prisma.pipeline.create({
      data: {
        name: PIPELINE_TYPE_NAMES[type] || `${type.charAt(0) + type.slice(1).toLowerCase()} Pipeline`,
        type: type as PipelineType,
        isDefault: type === 'DEFAULT',
        organizationId,
        stages: {
          create: stages.map((s) => ({
            name: s.name,
            order: s.order,
            color: s.color,
            isWinStage: s.isWinStage || false,
            isLostStage: s.isLostStage || false,
          })),
        },
      },
      include: { stages: { orderBy: { order: 'asc' } } },
    })
    pipelines.push(pipeline)
  }
  return pipelines
}

// GET /api/pipelines
export const getPipelines = async (req: Request, res: Response) => {
  const organizationId = (req as any).user.organizationId

  let pipelines = await prisma.pipeline.findMany({
    where: { organizationId },
    include: {
      stages: { orderBy: { order: 'asc' } },
      _count: { select: { leads: true } },
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })

  // Auto-create defaults if none exist
  if (pipelines.length === 0) {
    await seedDefaultPipelines(organizationId)
    pipelines = await prisma.pipeline.findMany({
      where: { organizationId },
      include: {
        stages: { orderBy: { order: 'asc' } },
        _count: { select: { leads: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
  }

  res.json({ success: true, data: pipelines })
}

// GET /api/pipelines/:id
export const getPipeline = async (req: Request, res: Response) => {
  const organizationId = (req as any).user.organizationId
  const { id } = req.params

  const pipeline = await prisma.pipeline.findFirst({
    where: { id, organizationId },
    include: {
      stages: { orderBy: { order: 'asc' } },
      _count: { select: { leads: true } },
    },
  })

  if (!pipeline) {
    return res.status(404).json({ success: false, error: 'Pipeline not found' })
  }

  res.json({ success: true, data: pipeline })
}

// GET /api/pipelines/:id/leads
export const getPipelineLeads = async (req: Request, res: Response) => {
  const organizationId = (req as any).user.organizationId
  const { id } = req.params

  const pipeline = await prisma.pipeline.findFirst({
    where: { id, organizationId },
    include: { stages: { orderBy: { order: 'asc' } } },
  })

  if (!pipeline) {
    return res.status(404).json({ success: false, error: 'Pipeline not found' })
  }

  const leads = await prisma.lead.findMany({
    where: { organizationId, pipelineId: id },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      tags: true,
      pipelineStage: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })

  // Group leads by stage
  const stagesWithLeads = pipeline.stages.map((stage) => ({
    ...stage,
    leads: leads.filter((l) => l.pipelineStageId === stage.id),
  }))

  // Also include leads with no stage (assigned to pipeline but no specific stage)
  const unstagedLeads = leads.filter((l) => !l.pipelineStageId)

  res.json({
    success: true,
    data: {
      pipeline,
      stages: stagesWithLeads,
      unstagedLeads,
      totalLeads: leads.length,
    },
  })
}

// PATCH /api/leads/:leadId/pipeline — move a lead to a pipeline + stage
export const moveLeadToPipelineStage = async (req: Request, res: Response) => {
  const organizationId = (req as any).user.organizationId
  const { leadId } = req.params
  const { pipelineId, pipelineStageId } = req.body

  // Verify lead belongs to org
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
  })
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' })
  }

  // Verify pipeline + stage belong to org
  if (pipelineId) {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: pipelineId, organizationId },
    })
    if (!pipeline) {
      return res.status(404).json({ success: false, error: 'Pipeline not found' })
    }
  }

  if (pipelineStageId) {
    const stage = await prisma.pipelineStage.findFirst({
      where: { id: pipelineStageId },
      include: { pipeline: true },
    })
    if (!stage || stage.pipeline.organizationId !== organizationId) {
      return res.status(404).json({ success: false, error: 'Pipeline stage not found' })
    }

    // Auto-set pipelineId if only stageId given
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        pipelineId: pipelineId || stage.pipelineId,
        pipelineStageId,
      },
      include: { pipelineStage: true, pipeline: true },
    })

    // Create activity for stage change
    await prisma.activity.create({
      data: {
        type: 'STAGE_CHANGED',
        title: `Moved to ${stage.name}`,
        description: `Lead moved to stage "${stage.name}" in ${stage.pipeline.name}`,
        leadId,
        userId: (req as any).user.id,
        organizationId,
      },
    })

    return res.json({ success: true, data: updatedLead })
  }

  // Just assign to pipeline without a specific stage
  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: { pipelineId, pipelineStageId: null },
    include: { pipelineStage: true, pipeline: true },
  })

  res.json({ success: true, data: updatedLead })
}

// ─── Pipeline CRUD ──────────────────────────────────────────────────────

// POST /api/pipelines — create a new pipeline
export const createPipeline = async (req: Request, res: Response) => {
  const organizationId = (req as any).user.organizationId
  const { name, type, description, stages } = req.body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Pipeline name is required' })
  }

  const pipelineType = (type && Object.values(PipelineType).includes(type)) ? type : 'CUSTOM'

  // Build stages — either from request body or use defaults
  const stageData =
    Array.isArray(stages) && stages.length > 0
      ? stages.map((s: { name: string; color?: string; isWinStage?: boolean; isLostStage?: boolean }, i: number) => ({
          name: s.name,
          order: i + 1,
          color: s.color || '#6B7280',
          isWinStage: s.isWinStage || false,
          isLostStage: s.isLostStage || false,
        }))
      : DEFAULT_PIPELINE_STAGES[pipelineType] || DEFAULT_PIPELINE_STAGES.DEFAULT

  const pipeline = await prisma.pipeline.create({
    data: {
      name: name.trim(),
      type: pipelineType as PipelineType,
      description: description || null,
      isDefault: false,
      organizationId,
      stages: { create: stageData },
    },
    include: {
      stages: { orderBy: { order: 'asc' } },
      _count: { select: { leads: true } },
    },
  })

  res.status(201).json({ success: true, data: pipeline })
}

// PUT /api/pipelines/:id — update pipeline name/description
export const updatePipeline = async (req: Request, res: Response) => {
  const organizationId = (req as any).user.organizationId
  const { id } = req.params
  const { name, description, isDefault } = req.body

  const existing = await prisma.pipeline.findFirst({ where: { id, organizationId } })
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Pipeline not found' })
  }

  // If marking as default, un-default others
  if (isDefault === true) {
    await prisma.pipeline.updateMany({
      where: { organizationId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    })
  }

  const pipeline = await prisma.pipeline.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description || null }),
      ...(typeof isDefault === 'boolean' && { isDefault }),
    },
    include: {
      stages: { orderBy: { order: 'asc' } },
      _count: { select: { leads: true } },
    },
  })

  res.json({ success: true, data: pipeline })
}

// DELETE /api/pipelines/:id — delete pipeline (reassign leads to null)
export const deletePipeline = async (req: Request, res: Response) => {
  const organizationId = (req as any).user.organizationId
  const { id } = req.params

  const existing = await prisma.pipeline.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { leads: true } } },
  })
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Pipeline not found' })
  }

  // Clear pipeline/stage references from leads before deleting
  await prisma.lead.updateMany({
    where: { pipelineId: id },
    data: { pipelineId: null, pipelineStageId: null },
  })

  // Cascade deletes stages automatically
  await prisma.pipeline.delete({ where: { id } })

  res.json({ success: true, message: `Pipeline deleted. ${existing._count.leads} leads unassigned.` })
}

// ─── Stage CRUD ─────────────────────────────────────────────────────────

// POST /api/pipelines/:id/stages — add a stage to a pipeline
export const createStage = async (req: Request, res: Response) => {
  const organizationId = (req as any).user.organizationId
  const { id: pipelineId } = req.params
  const { name, color, description, isWinStage, isLostStage, insertAfterOrder } = req.body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Stage name is required' })
  }

  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, organizationId },
    include: { stages: { orderBy: { order: 'asc' } } },
  })
  if (!pipeline) {
    return res.status(404).json({ success: false, error: 'Pipeline not found' })
  }

  // Calculate order — insert after specified position or append at end
  const maxOrder = pipeline.stages.length > 0 ? Math.max(...pipeline.stages.map(s => s.order)) : 0
  const newOrder = typeof insertAfterOrder === 'number' ? insertAfterOrder + 1 : maxOrder + 1

  // Shift existing stages at or after this position
  if (typeof insertAfterOrder === 'number') {
    await prisma.pipelineStage.updateMany({
      where: { pipelineId, order: { gte: newOrder } },
      data: { order: { increment: 1 } },
    })
  }

  const stage = await prisma.pipelineStage.create({
    data: {
      name: name.trim(),
      order: newOrder,
      color: color || '#6B7280',
      description: description || null,
      isWinStage: isWinStage || false,
      isLostStage: isLostStage || false,
      pipelineId,
    },
  })

  res.status(201).json({ success: true, data: stage })
}

// PUT /api/pipelines/:id/stages/:stageId — update a stage
export const updateStage = async (req: Request, res: Response) => {
  const organizationId = (req as any).user.organizationId
  const { id: pipelineId, stageId } = req.params
  const { name, color, description, isWinStage, isLostStage } = req.body

  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, organizationId },
  })
  if (!pipeline) {
    return res.status(404).json({ success: false, error: 'Pipeline not found' })
  }

  const existing = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipelineId },
  })
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Stage not found' })
  }

  const stage = await prisma.pipelineStage.update({
    where: { id: stageId },
    data: {
      ...(name && { name: name.trim() }),
      ...(color !== undefined && { color }),
      ...(description !== undefined && { description: description || null }),
      ...(typeof isWinStage === 'boolean' && { isWinStage }),
      ...(typeof isLostStage === 'boolean' && { isLostStage }),
    },
  })

  res.json({ success: true, data: stage })
}

// DELETE /api/pipelines/:id/stages/:stageId — delete a stage (move its leads to previous/fallback stage)
export const deleteStage = async (req: Request, res: Response) => {
  const organizationId = (req as any).user.organizationId
  const { id: pipelineId, stageId } = req.params
  const { moveLeadsToStageId } = req.body

  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, organizationId },
    include: { stages: { orderBy: { order: 'asc' } } },
  })
  if (!pipeline) {
    return res.status(404).json({ success: false, error: 'Pipeline not found' })
  }

  const stageToDelete = pipeline.stages.find(s => s.id === stageId)
  if (!stageToDelete) {
    return res.status(404).json({ success: false, error: 'Stage not found' })
  }

  if (pipeline.stages.length <= 1) {
    return res.status(400).json({ success: false, error: 'Cannot delete the last stage in a pipeline' })
  }

  // Determine where to move leads
  let targetStageId = moveLeadsToStageId
  if (!targetStageId) {
    // Default: move to previous stage, or next if first
    const stageIndex = pipeline.stages.findIndex(s => s.id === stageId)
    const fallback = stageIndex > 0 ? pipeline.stages[stageIndex - 1] : pipeline.stages[stageIndex + 1]
    targetStageId = fallback.id
  }

  // Move leads to target stage
  await prisma.lead.updateMany({
    where: { pipelineStageId: stageId },
    data: { pipelineStageId: targetStageId },
  })

  // Delete the stage
  await prisma.pipelineStage.delete({ where: { id: stageId } })

  // Reorder remaining stages to be sequential
  const remainingStages = await prisma.pipelineStage.findMany({
    where: { pipelineId },
    orderBy: { order: 'asc' },
  })

  for (let i = 0; i < remainingStages.length; i++) {
    if (remainingStages[i].order !== i + 1) {
      await prisma.pipelineStage.update({
        where: { id: remainingStages[i].id },
        data: { order: i + 1 },
      })
    }
  }

  res.json({ success: true, message: 'Stage deleted and leads reassigned' })
}

// PATCH /api/pipelines/:id/stages/reorder — reorder stages
export const reorderStages = async (req: Request, res: Response) => {
  const organizationId = (req as any).user.organizationId
  const { id: pipelineId } = req.params
  const { stageIds } = req.body // Ordered array of stage IDs

  if (!Array.isArray(stageIds) || stageIds.length === 0) {
    return res.status(400).json({ success: false, error: 'stageIds array is required' })
  }

  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, organizationId },
  })
  if (!pipeline) {
    return res.status(404).json({ success: false, error: 'Pipeline not found' })
  }

  // First set all to negative to avoid unique constraint conflicts during reorder
  await prisma.pipelineStage.updateMany({
    where: { pipelineId },
    data: { order: -1 },
  })

  // Update each stage's order
  for (let i = 0; i < stageIds.length; i++) {
    await prisma.pipelineStage.update({
      where: { id: stageIds[i] },
      data: { order: i + 1 },
    })
  }

  const updatedStages = await prisma.pipelineStage.findMany({
    where: { pipelineId },
    orderBy: { order: 'asc' },
  })

  res.json({ success: true, data: updatedStages })
}

// POST /api/pipelines/:id/duplicate — duplicate a pipeline
export const duplicatePipeline = async (req: Request, res: Response) => {
  const organizationId = (req as any).user.organizationId
  const { id } = req.params
  const { name } = req.body

  const source = await prisma.pipeline.findFirst({
    where: { id, organizationId },
    include: { stages: { orderBy: { order: 'asc' } } },
  })
  if (!source) {
    return res.status(404).json({ success: false, error: 'Pipeline not found' })
  }

  const duplicated = await prisma.pipeline.create({
    data: {
      name: name || `${source.name} (Copy)`,
      type: 'CUSTOM' as PipelineType,
      description: source.description,
      isDefault: false,
      organizationId,
      stages: {
        create: source.stages.map(s => ({
          name: s.name,
          order: s.order,
          color: s.color,
          description: s.description,
          isWinStage: s.isWinStage,
          isLostStage: s.isLostStage,
        })),
      },
    },
    include: {
      stages: { orderBy: { order: 'asc' } },
      _count: { select: { leads: true } },
    },
  })

  res.status(201).json({ success: true, data: duplicated })
}
