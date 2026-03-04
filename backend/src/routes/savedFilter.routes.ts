import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  getSavedFilterViews,
  createSavedFilterView,
  updateSavedFilterView,
  deleteSavedFilterView,
} from '../controllers/savedFilter.controller'

const router = Router()

router.use(authenticate)

router.get('/', getSavedFilterViews)
router.post('/', createSavedFilterView)
router.patch('/:id', updateSavedFilterView)
router.delete('/:id', deleteSavedFilterView)

export default router
