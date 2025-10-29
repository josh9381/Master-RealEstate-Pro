import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  listAppointmentsQuerySchema,
  calendarQuerySchema,
  upcomingQuerySchema,
  sendReminderSchema,
} from '../validators/appointment.validator';
import {
  listAppointments,
  createAppointment,
  getAppointment,
  updateAppointment,
  cancelAppointment,
  confirmAppointment,
  getCalendarView,
  getUpcomingAppointments,
  sendReminder,
} from '../controllers/appointment.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/appointments/calendar
 * @desc    Get calendar view of appointments
 * @access  Private
 */
router.get(
  '/calendar',
  validateQuery(calendarQuerySchema),
  asyncHandler(getCalendarView)
);

/**
 * @route   GET /api/appointments/upcoming
 * @desc    Get upcoming appointments
 * @access  Private
 */
router.get(
  '/upcoming',
  validateQuery(upcomingQuerySchema),
  asyncHandler(getUpcomingAppointments)
);

/**
 * @route   GET /api/appointments
 * @desc    List appointments with filters
 * @access  Private
 */
router.get(
  '/',
  validateQuery(listAppointmentsQuerySchema),
  asyncHandler(listAppointments)
);

/**
 * @route   POST /api/appointments
 * @desc    Create new appointment
 * @access  Private
 */
router.post(
  '/',
  validateBody(createAppointmentSchema),
  asyncHandler(createAppointment)
);

/**
 * @route   GET /api/appointments/:id
 * @desc    Get appointment details
 * @access  Private
 */
router.get('/:id', asyncHandler(getAppointment));

/**
 * @route   PUT /api/appointments/:id
 * @desc    Update appointment
 * @access  Private
 */
router.put(
  '/:id',
  validateBody(updateAppointmentSchema),
  asyncHandler(updateAppointment)
);

/**
 * @route   DELETE /api/appointments/:id
 * @desc    Cancel appointment
 * @access  Private
 */
router.delete('/:id', asyncHandler(cancelAppointment));

/**
 * @route   PATCH /api/appointments/:id/confirm
 * @desc    Confirm appointment
 * @access  Private
 */
router.patch('/:id/confirm', asyncHandler(confirmAppointment));

/**
 * @route   POST /api/appointments/:id/reminder
 * @desc    Send appointment reminder
 * @access  Private
 */
router.post(
  '/:id/reminder',
  validateBody(sendReminderSchema),
  asyncHandler(sendReminder)
);

export default router;
