import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { workflowTriggerLimiter } from '../middleware/rateLimiter'
import { validateBody, validateQuery } from '../middleware/validate'
import { asyncHandler } from '../utils/asyncHandler'
import { enforcePlanLimit } from '../middleware/planLimits'
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  toggleWorkflowSchema,
  testWorkflowSchema,
  workflowQuerySchema,
} from '../validators/workflow.validator'
import {
  getWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflow,
  testWorkflow,
  getWorkflowExecutions,
  getWorkflowStats,
  getWorkflowAnalytics,
  triggerWorkflow,
  triggerWorkflowsForLead,
} from '../controllers/workflow.controller'

const router = Router()

// All workflow routes require authentication
router.use(authenticate)

/**
 * @route   GET /api/workflows/stats
 * @desc    Get workflow statistics
 * @access  Private
 */
router.get('/stats', asyncHandler(getWorkflowStats))

/**
 * @route   GET /api/workflows
 * @desc    Get all workflows
 * @access  Private
 */
router.get(
  '/',
  validateQuery(workflowQuerySchema),
  asyncHandler(getWorkflows)
)

/**
 * @route   GET /api/workflows/:id
 * @desc    Get single workflow
 * @access  Private
 */
router.get('/:id', asyncHandler(getWorkflow))

/**
 * @route   POST /api/workflows
 * @desc    Create workflow
 * @access  Private
 */
router.post(
  '/',
  validateBody(createWorkflowSchema),
  enforcePlanLimit('workflows'),
  asyncHandler(createWorkflow)
)

/**
 * @route   PUT /api/workflows/:id
 * @desc    Update workflow
 * @access  Private
 */
router.put(
  '/:id',
  validateBody(updateWorkflowSchema),
  asyncHandler(updateWorkflow)
)

/**
 * @route   DELETE /api/workflows/:id
 * @desc    Delete workflow
 * @access  Private
 */
router.delete('/:id', asyncHandler(deleteWorkflow))

/**
 * @route   PATCH /api/workflows/:id/toggle
 * @desc    Toggle workflow active state
 * @access  Private
 */
router.patch(
  '/:id/toggle',
  validateBody(toggleWorkflowSchema),
  asyncHandler(toggleWorkflow)
)

/**
 * @route   POST /api/workflows/:id/test
 * @desc    Test workflow execution
 * @access  Private
 */
router.post(
  '/:id/test',
  validateBody(testWorkflowSchema),
  asyncHandler(testWorkflow)
)

/**
 * @route   GET /api/workflows/:id/executions
 * @desc    Get workflow execution history
 * @access  Private
 */
router.get('/:id/executions', asyncHandler(getWorkflowExecutions))

/**
 * @route   GET /api/workflows/:id/analytics
 * @desc    Get workflow analytics (success rate, daily stats, etc.)
 * @access  Private
 */
router.get('/:id/analytics', asyncHandler(getWorkflowAnalytics))

/**
 * @route   POST /api/workflows/:id/trigger
 * @desc    Manually trigger a workflow
 * @access  Private
 */
router.post('/:id/trigger', workflowTriggerLimiter, asyncHandler(triggerWorkflow))

/**
 * @route   POST /api/workflows/trigger-for-lead
 * @desc    Trigger workflows for lead events (internal use)
 * @access  Private
 */
router.post('/trigger-for-lead', workflowTriggerLimiter, asyncHandler(triggerWorkflowsForLead))

/**
 * @route   POST /api/workflows/webhook/:id
 * @desc    Webhook trigger endpoint for external callers
 * @access  Private (authenticated)
 */
router.post('/webhook/:id', workflowTriggerLimiter, asyncHandler(async (req: import('express').Request, res: import('express').Response) => {
  const { prisma } = await import('../config/database')
  const { manualTriggerWorkflow } = await import('../services/workflow.service')
  const { id } = req.params
  const { leadId } = req.body

  const workflow = await prisma.workflow.findFirst({
    where: {
      id,
      organizationId: req.user!.organizationId,
      triggerType: 'WEBHOOK',
      isActive: true,
    },
  })

  if (!workflow) {
    res.status(404).json({ success: false, message: 'Active webhook workflow not found' })
    return
  }

  if (leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: req.user!.organizationId },
    })
    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' })
      return
    }
  }

  const executionId = await manualTriggerWorkflow(id, leadId)

  res.json({
    success: true,
    data: { executionId },
    message: 'Webhook workflow triggered successfully',
  })
}))

export default router
