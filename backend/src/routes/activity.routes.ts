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

const router = Router()

// All routes require authentication
router.use(authenticate)

// Main activity routes (stats and relationship routes BEFORE :id param routes)
router.get('/stats', asyncHandler(getActivityStats))
router.get('/lead/:leadId', asyncHandler(getLeadActivities))
router.get('/campaign/:campaignId', asyncHandler(getCampaignActivities))

router.get('/', asyncHandler(getActivities))
router.get('/:id', asyncHandler(getActivity))
router.post('/', asyncHandler(createActivity))
router.put('/:id', asyncHandler(updateActivity))
router.delete('/:id', asyncHandler(deleteActivity))

export default router
