import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { asyncHandler } from '../utils/asyncHandler'
import {
  getActivities,
  getActivityStats,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
  getLeadActivities,
  getCampaignActivities
} from '../controllers/activity.controller'
import prisma from '../config/database'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Main activity routes (stats and relationship routes BEFORE :id param routes)
router.get('/stats', asyncHandler(getActivityStats))

/**
 * @route   GET /api/activities/user
 * @desc    Get current user's activities
 * @access  Private
 */
router.get('/user', asyncHandler(async (req: any, res: any) => {
  const activities = await prisma.activity.findMany({
    where: {
      userId: req.user!.userId,
      organizationId: req.user!.organizationId
    },
    orderBy: { createdAt: 'desc' },
    take: parseInt(req.query.limit as string) || 50,
    skip: parseInt(req.query.page as string) ? (parseInt(req.query.page as string) - 1) * (parseInt(req.query.limit as string) || 50) : 0,
    include: { lead: { select: { id: true, firstName: true, lastName: true } } }
  })
  res.json({ success: true, data: activities })
}))
router.get('/lead/:leadId', asyncHandler(getLeadActivities))
router.get('/campaign/:campaignId', asyncHandler(getCampaignActivities))

router.get('/', asyncHandler(getActivities))
router.get('/:id', asyncHandler(getActivity))
router.post('/', asyncHandler(createActivity))
router.put('/:id', asyncHandler(updateActivity))
router.delete('/:id', asyncHandler(deleteActivity))

export default router
