import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../middleware/errorHandler';
import { sendAppointmentReminder } from '../services/reminder.service';

/**
 * List appointments with pagination and filters
 * GET /api/appointments
 */
export async function listAppointments(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { 
    page = 1, 
    limit = 20, 
    status, 
    type, 
    leadId, 
    startDate, 
    endDate 
  } = req.query as any;

  const pageNum = parseInt(String(page), 10);
  const limitNum = parseInt(String(limit), 10);
  const skip = (pageNum - 1) * limitNum;

  // Build where clause
  const where: any = {
    userId: req.user.userId,
  };

  if (status) where.status = status;
  if (type) where.type = type;
  if (leadId) where.leadId = leadId;
  
  if (startDate || endDate) {
    where.startTime = {};
    if (startDate) where.startTime.gte = new Date(startDate as string);
    if (endDate) where.startTime.lte = new Date(endDate as string);
  }

  // Get total count and appointments
  const [total, appointments] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
      skip,
      take: limitNum,
    }),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  res.status(200).json({
    success: true,
    data: {
      appointments,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    },
  });
}

/**
 * Create new appointment
 * POST /api/appointments
 */
export async function createAppointment(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const {
    title,
    description,
    type,
    startTime,
    endTime,
    location,
    meetingUrl,
    leadId,
    attendees,
  } = req.body;

  // Verify lead exists if provided
  if (leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }
  }

  // Create appointment
  const appointment = await prisma.appointment.create({
    data: {
      title,
      description,
      type,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location,
      meetingUrl,
      leadId,
      userId: req.user.userId,
      attendees: attendees || [],
    },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Appointment created successfully',
    data: { appointment },
  });
}

/**
 * Get appointment details
 * GET /api/appointments/:id
 */
export async function getAppointment(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.params;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  // Verify ownership
  if (appointment.userId !== req.user.userId) {
    throw new UnauthorizedError('Not authorized to view this appointment');
  }

  res.status(200).json({
    success: true,
    data: { appointment },
  });
}

/**
 * Update appointment
 * PUT /api/appointments/:id
 */
export async function updateAppointment(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.params;
  const {
    title,
    description,
    startTime,
    endTime,
    location,
    meetingUrl,
    status,
    leadId,
    attendees,
  } = req.body;

  // Check appointment exists and user owns it
  const existingAppointment = await prisma.appointment.findUnique({
    where: { id },
  });

  if (!existingAppointment) {
    throw new NotFoundError('Appointment not found');
  }

  if (existingAppointment.userId !== req.user.userId) {
    throw new UnauthorizedError('Not authorized to update this appointment');
  }

  // Verify lead if being updated
  if (leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }
  }

  // Build update data
  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (startTime !== undefined) updateData.startTime = new Date(startTime);
  if (endTime !== undefined) updateData.endTime = new Date(endTime);
  if (location !== undefined) updateData.location = location;
  if (meetingUrl !== undefined) updateData.meetingUrl = meetingUrl;
  if (status !== undefined) updateData.status = status;
  if (leadId !== undefined) updateData.leadId = leadId;
  if (attendees !== undefined) updateData.attendees = attendees;

  const appointment = await prisma.appointment.update({
    where: { id },
    data: updateData,
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    message: 'Appointment updated successfully',
    data: { appointment },
  });
}

/**
 * Cancel appointment (soft delete - sets status to CANCELLED)
 * DELETE /api/appointments/:id
 */
export async function cancelAppointment(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.params;

  // Check appointment exists and user owns it
  const existingAppointment = await prisma.appointment.findUnique({
    where: { id },
  });

  if (!existingAppointment) {
    throw new NotFoundError('Appointment not found');
  }

  if (existingAppointment.userId !== req.user.userId) {
    throw new UnauthorizedError('Not authorized to cancel this appointment');
  }

  // Set status to CANCELLED instead of deleting
  await prisma.appointment.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  res.status(200).json({
    success: true,
    message: 'Appointment cancelled successfully',
  });
}

/**
 * Confirm appointment
 * PATCH /api/appointments/:id/confirm
 */
export async function confirmAppointment(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.params;

  // Check appointment exists and user owns it
  const existingAppointment = await prisma.appointment.findUnique({
    where: { id },
  });

  if (!existingAppointment) {
    throw new NotFoundError('Appointment not found');
  }

  if (existingAppointment.userId !== req.user.userId) {
    throw new UnauthorizedError('Not authorized to confirm this appointment');
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: 'CONFIRMED' },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    message: 'Appointment confirmed',
    data: { appointment },
  });
}

/**
 * Get calendar view of appointments
 * GET /api/appointments/calendar
 */
export async function getCalendarView(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { startDate, endDate, view = 'week' } = req.query as any;

  const appointments = await prisma.appointment.findMany({
    where: {
      userId: req.user.userId,
      startTime: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      status: {
        notIn: ['CANCELLED'],
      },
    },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  // Calculate summary statistics
  const summary = {
    total: appointments.length,
    byType: appointments.reduce((acc: any, apt) => {
      acc[apt.type] = (acc[apt.type] || 0) + 1;
      return acc;
    }, {}),
    byStatus: appointments.reduce((acc: any, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    }, {}),
  };

  res.status(200).json({
    success: true,
    data: {
      appointments,
      summary,
      view,
    },
  });
}

/**
 * Get upcoming appointments
 * GET /api/appointments/upcoming
 */
export async function getUpcomingAppointments(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { days = 7, limit = 10 } = req.query as any;
  const daysNum = parseInt(String(days), 10);
  const limitNum = parseInt(String(limit), 10);

  const now = new Date();
  const futureDate = new Date(now.getTime() + daysNum * 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      userId: req.user.userId,
      startTime: {
        gte: now,
        lte: futureDate,
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED'],
      },
    },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: { startTime: 'asc' },
    take: limitNum,
  });

  res.status(200).json({
    success: true,
    data: {
      appointments,
      count: appointments.length,
      daysAhead: days,
    },
  });
}

/**
 * Send appointment reminder
 * POST /api/appointments/:id/reminder
 */
export async function sendReminder(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.params;
  const { method = 'email', message } = req.body;

  // Check appointment exists and user owns it
  const appointment = await prisma.appointment.findUnique({
    where: { id },
  });

  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  if (appointment.userId !== req.user.userId) {
    throw new UnauthorizedError('Not authorized to send reminder for this appointment');
  }

  // Check appointment is in the future
  if (new Date(appointment.startTime) < new Date()) {
    throw new BadRequestError('Cannot send reminder for past appointments');
  }

  // Send reminder
  const result = await sendAppointmentReminder({
    appointmentId: id,
    method,
    customMessage: message,
  });

  res.status(200).json({
    success: true,
    message: 'Reminder sent successfully',
    data: {
      sent: result,
    },
  });
}
