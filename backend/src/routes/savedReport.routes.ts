import { Router } from 'express'
import {
  listSavedReports,
  getSavedReport,
  createSavedReport,
  updateSavedReport,
  deleteSavedReport,
} from '../controllers/savedReport.controller'

const router = Router()

router.get('/', listSavedReports)
router.get('/:id', getSavedReport)
router.post('/', createSavedReport)
router.put('/:id', updateSavedReport)
router.delete('/:id', deleteSavedReport)

export default router
