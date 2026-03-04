import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  getReminders,
  getReminder,
  createReminder,
  updateReminder,
  completeReminder,
  snoozeReminder,
  deleteReminder,
  getUpcomingReminders,
} from '../controllers/reminder.controller'

const router = Router()

router.use(authenticate)

router.get('/upcoming', getUpcomingReminders)
router.get('/', getReminders)
router.get('/:id', getReminder)
router.post('/', createReminder)
router.patch('/:id', updateReminder)
router.patch('/:id/complete', completeReminder)
router.patch('/:id/snooze', snoozeReminder)
router.delete('/:id', deleteReminder)

export default router
