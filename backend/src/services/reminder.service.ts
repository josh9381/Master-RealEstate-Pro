import { prisma } from '../config/database';
import { sendEmail } from './email.service';
import { sendSMS } from './sms.service';

interface SendReminderOptions {
  appointmentId: string;
  method: 'email' | 'sms' | 'both';
  customMessage?: string;
}

interface ReminderResult {
  email?: boolean;
  sms?: boolean;
}

/**
 * Send appointment reminder via email, SMS, or both
 */
export async function sendAppointmentReminder(options: SendReminderOptions): Promise<ReminderResult> {
  const { appointmentId, method, customMessage } = options;

  // Get appointment with lead and user details
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      lead: true,
      user: true,
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  const result: ReminderResult = {};

  // Format date and time
  const startTime = new Date(appointment.startTime);
  const formattedDate = startTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = startTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Build reminder message
  const defaultMessage = customMessage || `Reminder: You have an appointment scheduled.`;
  
  const emailBody = `
    <h2>Appointment Reminder</h2>
    <p>${defaultMessage}</p>
    
    <h3>Appointment Details:</h3>
    <ul>
      <li><strong>Title:</strong> ${appointment.title}</li>
      <li><strong>Type:</strong> ${appointment.type}</li>
      <li><strong>Date:</strong> ${formattedDate}</li>
      <li><strong>Time:</strong> ${formattedTime}</li>
      ${appointment.location ? `<li><strong>Location:</strong> ${appointment.location}</li>` : ''}
      ${appointment.meetingUrl ? `<li><strong>Meeting Link:</strong> <a href="${appointment.meetingUrl}">${appointment.meetingUrl}</a></li>` : ''}
      ${appointment.description ? `<li><strong>Description:</strong> ${appointment.description}</li>` : ''}
    </ul>
    
    ${appointment.lead ? `
      <h3>Contact Information:</h3>
      <ul>
        <li><strong>Name:</strong> ${appointment.lead.firstName} ${appointment.lead.lastName}</li>
        ${appointment.lead.email ? `<li><strong>Email:</strong> ${appointment.lead.email}</li>` : ''}
        ${appointment.lead.phone ? `<li><strong>Phone:</strong> ${appointment.lead.phone}</li>` : ''}
      </ul>
    ` : ''}
    
    <p>Please confirm your attendance or reschedule if necessary.</p>
  `;

  const smsMessage = `Reminder: ${appointment.title} on ${formattedDate} at ${formattedTime}. ${appointment.location || appointment.meetingUrl || ''}`;

  // Send email reminder
  if (method === 'email' || method === 'both') {
    try {
      const emailRecipients: string[] = [];
      
      // Add lead email if exists
      if (appointment.lead?.email) {
        emailRecipients.push(appointment.lead.email);
      }
      
      // Add attendee emails
      if (appointment.attendees && Array.isArray(appointment.attendees)) {
        const attendees = appointment.attendees as Array<{ email: string; name: string }>;
        attendees.forEach((attendee: { email: string }) => {
          if (attendee.email && !emailRecipients.includes(attendee.email)) {
            emailRecipients.push(attendee.email);
          }
        });
      }

      if (emailRecipients.length > 0) {
        for (const recipient of emailRecipients) {
          await sendEmail({
            to: recipient,
            subject: `Appointment Reminder: ${appointment.title}`,
            html: emailBody,
            organizationId: appointment.lead?.organizationId || appointment.organizationId,
          });
        }
        result.email = true;
      } else {
        result.email = false;
      }
    } catch (error) {
      console.error('Failed to send email reminder:', error);
      result.email = false;
    }
  }

  // Send SMS reminder
  if (method === 'sms' || method === 'both') {
    try {
      const smsRecipients: string[] = [];
      
      // Add lead phone if exists
      if (appointment.lead?.phone) {
        smsRecipients.push(appointment.lead.phone);
      }

      if (smsRecipients.length > 0) {
        for (const phone of smsRecipients) {
          await sendSMS({
            to: phone,
            message: smsMessage,
            organizationId: appointment.lead?.organizationId || appointment.organizationId,
          });
        }
        result.sms = true;
      } else {
        result.sms = false;
      }
    } catch (error) {
      console.error('Failed to send SMS reminder:', error);
      result.sms = false;
    }
  }

  // Mark reminder as sent if at least one method succeeded
  if (result.email || result.sms) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { reminderSent: true },
    });
  }

  return result;
}

/**
 * Send reminders for all appointments in the next 24 hours
 * This can be called from a cron job
 */
export async function sendUpcomingReminders(): Promise<number> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find appointments in next 24 hours that haven't received reminders
  const appointments = await prisma.appointment.findMany({
    where: {
      startTime: {
        gte: now,
        lte: tomorrow,
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED'],
      },
      reminderSent: false,
    },
    include: {
      lead: {
        select: {
          organizationId: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  let sentCount = 0;

  for (const appointment of appointments) {
    try {
      await sendAppointmentReminder({
        appointmentId: appointment.id,
        method: 'both', // Send both email and SMS
      });
      sentCount++;
    } catch (error) {
      console.error(`Failed to send reminder for appointment ${appointment.id}:`, error);
    }
  }

  return sentCount;
}
