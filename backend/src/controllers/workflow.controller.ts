import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { NotFoundError, ValidationError } from '../middleware/errorHandler'
import type { WorkflowTrigger } from '@prisma/client'

// Get all workflows
export const getWorkflows = async (req: Request, res: Response) => {
  const { isActive, triggerType, search } = req.query

  const where: Record<string, unknown> = {}

  if (isActive !== undefined) {
    where.isActive = isActive === 'true'
  }

  if (triggerType) {
    where.triggerType = triggerType as WorkflowTrigger
  }

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
    ]
  }

  const workflows = await prisma.workflow.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      workflowExecutions: {
        take: 5,
        orderBy: { startedAt: 'desc' },
      },
    },
  })

  res.json({
    success: true,
    data: {
      workflows,
      total: workflows.length,
    }
  })
}

// Get single workflow
export const getWorkflow = async (req: Request, res: Response) => {
  const { id } = req.params

  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: {
      workflowExecutions: {
        take: 20,
        orderBy: { startedAt: 'desc' },
      },
    },
  })

  if (!workflow) {
    throw new NotFoundError('Workflow not found')
  }

  res.json({
    success: true,
    data: { workflow }
  })
}

// Create workflow
export const createWorkflow = async (req: Request, res: Response) => {
  const { name, description, triggerType, triggerData, actions, isActive } = req.body

  if (!name || !triggerType || !actions) {
    throw new ValidationError('Name, triggerType, and actions are required')
  }

  if (!Array.isArray(actions) || actions.length === 0) {
    throw new ValidationError('Actions must be a non-empty array')
  }

  const workflow = await prisma.workflow.create({
    data: {
      name,
      description,
      triggerType,
      triggerData: triggerData || {},
      actions,
      isActive: isActive !== undefined ? isActive : false, // Default to false if not specified
    },
  })

  res.status(201).json({
    success: true,
    data: { workflow }
  })
}

// Update workflow
export const updateWorkflow = async (req: Request, res: Response) => {
  const { id } = req.params
  const { name, description, triggerType, triggerData, actions, isActive } = req.body

  const existingWorkflow = await prisma.workflow.findUnique({
    where: { id },
  })

  if (!existingWorkflow) {
    throw new NotFoundError('Workflow not found')
  }

  if (actions && (!Array.isArray(actions) || actions.length === 0)) {
    throw new ValidationError('Actions must be a non-empty array')
  }

  const workflow = await prisma.workflow.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(triggerType && { triggerType }),
      ...(triggerData !== undefined && { triggerData }),
      ...(actions && { actions }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  res.json({
    success: true,
    data: { workflow }
  })
}

// Delete workflow
export const deleteWorkflow = async (req: Request, res: Response) => {
  const { id } = req.params

  const existingWorkflow = await prisma.workflow.findUnique({
    where: { id },
  })

  if (!existingWorkflow) {
    throw new NotFoundError('Workflow not found')
  }

  // Cannot delete active workflows
  if (existingWorkflow.isActive) {
    throw new ValidationError('Cannot delete an active workflow. Please deactivate it first.')
  }

  await prisma.workflow.delete({
    where: { id },
  })

  res.json({
    success: true,
    message: 'Workflow deleted successfully'
  })
}

// Toggle workflow active state
export const toggleWorkflow = async (req: Request, res: Response) => {
  const { id } = req.params
  const { isActive } = req.body

  const existingWorkflow = await prisma.workflow.findUnique({
    where: { id },
  })

  if (!existingWorkflow) {
    throw new NotFoundError('Workflow not found')
  }

  if (isActive === undefined) {
    throw new ValidationError('isActive field is required')
  }

  const workflow = await prisma.workflow.update({
    where: { id },
    data: {
      isActive: Boolean(isActive),
    },
  })

  res.json({
    success: true,
    data: { workflow },
    message: `Workflow ${isActive ? 'activated' : 'deactivated'} successfully`,
  })
}

// Test workflow execution
export const testWorkflow = async (req: Request, res: Response) => {
  const { id } = req.params
  const { testData } = req.body

  const workflow = await prisma.workflow.findUnique({
    where: { id },
  })

  if (!workflow) {
    throw new NotFoundError('Workflow not found')
  }

  // Create a test execution log
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: id,
      status: 'SUCCESS',
      metadata: {
        test: true,
        testData: testData || {},
        executedAt: new Date().toISOString(),
      },
      startedAt: new Date(),
      completedAt: new Date(),
    },
  })

  // In production, this would actually execute the workflow actions
  // For now, we'll just simulate success

  res.json({
    success: true,
    data: {
      execution,
      note: 'Workflow test executed successfully (mock mode)',
      actions: workflow.actions,
    }
  })
}

// Get workflow executions
export const getWorkflowExecutions = async (req: Request, res: Response) => {
  const { id } = req.params
  const { page = 1, limit = 20 } = req.query

  const workflow = await prisma.workflow.findUnique({
    where: { id },
  })

  if (!workflow) {
    throw new NotFoundError('Workflow not found')
  }

  const pageNum = Number(page)
  const limitNum = Number(limit)
  const skip = (pageNum - 1) * limitNum

  const [executions, total] = await Promise.all([
    prisma.workflowExecution.findMany({
      where: { workflowId: id },
      orderBy: { startedAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.workflowExecution.count({ where: { workflowId: id } }),
  ])

  res.json({
    success: true,
    data: {
      executions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }
  })
}

// Get workflow statistics
export const getWorkflowStats = async (req: Request, res: Response) => {
  const totalWorkflows = await prisma.workflow.count()
  const activeWorkflows = await prisma.workflow.count({
    where: { isActive: true },
  })

  const totalExecutions = await prisma.workflowExecution.count()
  const successfulExecutions = await prisma.workflowExecution.count({
    where: { status: 'SUCCESS' },
  })
  const failedExecutions = await prisma.workflowExecution.count({
    where: { status: 'FAILED' },
  })

  const successRate = totalExecutions > 0 
    ? ((successfulExecutions / totalExecutions) * 100).toFixed(2) 
    : 0

  res.json({
    success: true,
    data: {
      totalWorkflows,
      activeWorkflows,
      inactiveWorkflows: totalWorkflows - activeWorkflows,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate: Number(successRate),
    }
  })
}

// Get workflow analytics (enhanced)
export const getWorkflowAnalytics = async (req: Request, res: Response) => {
  const { getWorkflowAnalytics: getWorkflowAnalyticsService } = await import('../services/workflow.service')
  
  const { id } = req.params
  const { days } = req.query

  const analytics = await getWorkflowAnalyticsService(
    id,
    days ? parseInt(days as string) : 30
  )

  res.json({
    success: true,
    data: analytics,
  })
}

// Manual trigger workflow
export const triggerWorkflow = async (req: Request, res: Response) => {
  const { manualTriggerWorkflow } = await import('../services/workflow.service')
  
  const { id } = req.params
  const { leadId } = req.body

  const executionId = await manualTriggerWorkflow(id, leadId)

  res.json({
    success: true,
    data: { executionId },
    message: 'Workflow triggered successfully',
  })
}

// Trigger workflows for lead event (internal use)
export const triggerWorkflowsForLead = async (req: Request, res: Response) => {
  const { triggerWorkflowsForLead: triggerWorkflowsForLeadService } = await import('../services/workflow.service')
  
  const { leadId, triggerType, metadata } = req.body

  if (!leadId || !triggerType) {
    throw new ValidationError('leadId and triggerType are required')
  }

  const results = await triggerWorkflowsForLeadService(
    leadId,
    triggerType as WorkflowTrigger,
    metadata
  )

  res.json({
    success: true,
    data: results,
    message: `Triggered ${results.length} workflow(s)`,
  })
}
