import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { asyncHandler } from '../utils/asyncHandler'
import {
  listReportSchedules,
  createReportSchedule,
  updateReportSchedule,
  deleteReportSchedule,
  getReportHistory,
} from '../controllers/reportSchedule.controller'

const router = Router()

router.use(authenticate)

router.get('/', asyncHandler(listReportSchedules))
router.post('/', asyncHandler(createReportSchedule))
router.patch('/:id', asyncHandler(updateReportSchedule))
router.delete('/:id', asyncHandler(deleteReportSchedule))
router.get('/:id/history', asyncHandler(getReportHistory))

export default router
