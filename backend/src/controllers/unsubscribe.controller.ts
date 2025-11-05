import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError } from '../middleware/errorHandler';
import crypto from 'crypto';

/**
 * Generate unsubscribe token for a lead
 * Helper function used when creating campaigns
 */
export const generateUnsubscribeToken = (leadId: string): string => {
  const token = crypto.randomBytes(32).toString('hex');
  return `${leadId}-${token}`;
};

/**
 * Unsubscribe a lead from email communications
 * GET /api/unsubscribe/:token
 */
export const unsubscribe = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { reason } = req.query;

  // Parse token to get lead ID
  const leadId = token.split('-')[0];

  if (!leadId) {
    throw new NotFoundError('Invalid unsubscribe token');
  }

  // Find the lead
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

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
    where: { id: leadId },
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

  // Parse token to get lead ID
  const leadId = token.split('-')[0];

  if (!leadId) {
    throw new NotFoundError('Invalid token');
  }

  // Find the lead
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  // Update lead to opt back in
  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
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

  // Parse token to get lead ID
  const leadId = token.split('-')[0];

  if (!leadId) {
    throw new NotFoundError('Invalid token');
  }

  // Find the lead
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
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

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  res.json({
    success: true,
    data: { lead },
  });
};

/**
 * Update email preferences (granular control)
 * PATCH /api/unsubscribe/:token/preferences
 */
export const updatePreferences = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { emailOptIn, reason } = req.body;

  // Parse token to get lead ID
  const leadId = token.split('-')[0];

  if (!leadId) {
    throw new NotFoundError('Invalid token');
  }

  // Find the lead
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  // Update preferences
  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
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
