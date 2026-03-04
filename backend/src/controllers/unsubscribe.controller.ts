import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError } from '../middleware/errorHandler';
import crypto from 'crypto';

/**
 * Generate unsubscribe token for a lead and store it
 * Returns the full token (leadId-randomHex)
 */
export const generateUnsubscribeToken = async (leadId: string): Promise<string> => {
  const randomPart = crypto.randomBytes(32).toString('hex');
  const token = `${leadId}-${randomPart}`;
  
  await prisma.lead.update({
    where: { id: leadId },
    data: { unsubscribeToken: token },
  });
  
  return token;
};

/**
 * Ensure a lead has an unsubscribe token, generating one if needed
 */
export const ensureUnsubscribeToken = async (leadId: string): Promise<string> => {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { unsubscribeToken: true },
  });
  
  if (lead?.unsubscribeToken) return lead.unsubscribeToken;
  return generateUnsubscribeToken(leadId);
};

/**
 * Validate an unsubscribe token — find the lead it belongs to
 */
async function validateToken(token: string) {
  if (!token || token.length < 10) {
    throw new NotFoundError('Invalid unsubscribe token');
  }
  
  // Look up by the full stored token (secure)
  const lead = await prisma.lead.findFirst({
    where: { unsubscribeToken: token },
  });
  
  if (!lead) {
    throw new NotFoundError('Invalid or expired unsubscribe token');
  }
  
  return lead;
}

/**
 * Unsubscribe a lead from email communications
 * GET /api/unsubscribe/:token
 */
export const unsubscribe = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { reason } = req.query;

  const lead = await validateToken(token);

  // Check if already unsubscribed
  if (!lead.emailOptIn) {
    res.json({
      success: true,
      message: 'You are already unsubscribed',
      data: { alreadyUnsubscribed: true },
    });
    return;
  }

  // Update lead to opt out
  const updatedLead = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      emailOptIn: false,
      emailOptOutAt: new Date(),
      emailOptOutReason: reason ? String(reason) : 'User requested',
    },
  });

  res.json({
    success: true,
    message: 'Successfully unsubscribed from email communications',
    data: { 
      lead: {
        id: updatedLead.id,
        email: updatedLead.email,
        emailOptIn: updatedLead.emailOptIn,
      }
    },
  });
};

/**
 * Resubscribe a lead to email communications
 * POST /api/unsubscribe/:token/resubscribe
 */
export const resubscribe = async (req: Request, res: Response) => {
  const { token } = req.params;

  const lead = await validateToken(token);

  // Update lead to opt back in
  const updatedLead = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      emailOptIn: true,
      emailOptOutAt: null,
      emailOptOutReason: null,
    },
  });

  res.json({
    success: true,
    message: 'Successfully resubscribed to email communications',
    data: { 
      lead: {
        id: updatedLead.id,
        email: updatedLead.email,
        emailOptIn: updatedLead.emailOptIn,
      }
    },
  });
};

/**
 * Get unsubscribe preferences for a lead
 * GET /api/unsubscribe/:token/preferences
 */
export const getPreferences = async (req: Request, res: Response) => {
  const { token } = req.params;

  const lead = await validateToken(token);

  res.json({
    success: true,
    data: {
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        emailOptIn: lead.emailOptIn,
        emailOptOutAt: lead.emailOptOutAt,
        emailOptOutReason: lead.emailOptOutReason,
      },
    },
  });
};

/**
 * Update email preferences (granular control)
 * PATCH /api/unsubscribe/:token/preferences
 */
export const updatePreferences = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { emailOptIn, reason } = req.body;

  const lead = await validateToken(token);

  // Update preferences
  const updatedLead = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      emailOptIn: emailOptIn !== undefined ? emailOptIn : lead.emailOptIn,
      emailOptOutAt: emailOptIn === false ? new Date() : null,
      emailOptOutReason: emailOptIn === false ? (reason || 'User requested') : null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      emailOptIn: true,
      emailOptOutAt: true,
      emailOptOutReason: true,
    },
  });

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: { lead: updatedLead },
  });
};
