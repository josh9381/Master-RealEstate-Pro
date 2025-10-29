import { z } from 'zod';

// Create appointment schema
export const createAppointmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().optional(),
  type: z.enum(['CALL', 'MEETING', 'DEMO', 'CONSULTATION', 'FOLLOW_UP'], {
    message: 'Invalid appointment type'
  }),
  startTime: z.string().datetime('Invalid start time format'),
  endTime: z.string().datetime('Invalid end time format'),
  location: z.string().optional(),
  meetingUrl: z.string().url('Invalid meeting URL').optional(),
  leadId: z.string().cuid('Invalid lead ID').optional(),
  attendees: z.array(z.object({
    email: z.string().email('Invalid attendee email'),
    name: z.string().min(1, 'Attendee name is required'),
    confirmed: z.boolean().optional().default(false)
  })).optional(),
}).refine(
  (data) => {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    return end > start;
  },
  { message: 'End time must be after start time', path: ['endTime'] }
).refine(
  (data) => data.location || data.meetingUrl,
  { message: 'Either location or meeting URL is required', path: ['location'] }
).refine(
  (data) => {
    const start = new Date(data.startTime);
    const now = new Date();
    return start > now;
  },
  { message: 'Start time must be in the future', path: ['startTime'] }
);

// Update appointment schema
export const updateAppointmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  leadId: z.string().cuid().optional(),
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(1),
    confirmed: z.boolean().optional()
  })).optional(),
}).refine(
  (data) => {
    if (data.startTime && data.endTime) {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      return end > start;
    }
    return true;
  },
  { message: 'End time must be after start time', path: ['endTime'] }
);

// List appointments query schema
export const listAppointmentsQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  type: z.enum(['CALL', 'MEETING', 'DEMO', 'CONSULTATION', 'FOLLOW_UP']).optional(),
  leadId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Calendar view query schema
export const calendarQuerySchema = z.object({
  startDate: z.string().datetime('Start date is required'),
  endDate: z.string().datetime('End date is required'),
  view: z.enum(['day', 'week', 'month']).optional().default('week'),
}).refine(
  (data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end > start;
  },
  { message: 'End date must be after start date', path: ['endDate'] }
);

// Upcoming appointments query schema
export const upcomingQuerySchema = z.object({
  days: z.coerce.number().min(1).max(90).optional().default(7),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
});

// Send reminder schema
export const sendReminderSchema = z.object({
  method: z.enum(['email', 'sms', 'both']).optional().default('email'),
  message: z.string().optional(),
});
