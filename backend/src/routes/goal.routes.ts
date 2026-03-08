import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { asyncHandler } from '../utils/asyncHandler'
import {
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoal,
} from '../controllers/goal.controller'

const router = Router()

router.use(authenticate)

router.get('/', asyncHandler(listGoals))
router.post('/', asyncHandler(createGoal))
router.get('/:id', asyncHandler(getGoal))
router.patch('/:id', asyncHandler(updateGoal))
router.delete('/:id', asyncHandler(deleteGoal))

export default router
