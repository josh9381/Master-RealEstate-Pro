import { Router } from 'express'
import { validateBody, validateParams } from '../middleware/validate'
import { createSavedReportSchema, updateSavedReportSchema, reportIdParamSchema } from '../validators/savedReport.validator'
import {
  listSavedReports,
  getSavedReport,
  createSavedReport,
  updateSavedReport,
  deleteSavedReport,
} from '../controllers/savedReport.controller'

const router = Router()

router.get('/', listSavedReports)
router.get('/:id', validateParams(reportIdParamSchema), getSavedReport)
router.post('/', validateBody(createSavedReportSchema), createSavedReport)
router.put('/:id', validateParams(reportIdParamSchema), validateBody(updateSavedReportSchema), updateSavedReport)
router.delete('/:id', validateParams(reportIdParamSchema), deleteSavedReport)

export default router
