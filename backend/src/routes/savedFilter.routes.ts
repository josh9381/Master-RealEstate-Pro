import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { asyncHandler } from '../utils/asyncHandler'
import {
  getSavedFilterViews,
  createSavedFilterView,
  updateSavedFilterView,
  deleteSavedFilterView,
} from '../controllers/savedFilter.controller'

const router = Router()

router.use(authenticate)

router.get('/', asyncHandler(getSavedFilterViews))
router.post('/', asyncHandler(createSavedFilterView))
router.patch('/:id', asyncHandler(updateSavedFilterView))
router.delete('/:id', asyncHandler(deleteSavedFilterView))

export default router
