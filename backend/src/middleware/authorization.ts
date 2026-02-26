import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, NotFoundError } from './errorHandler';
import prisma from '../config/database';

/**
 * Authorization middleware - Checks resource ownership
 * Protects against IDOR (Insecure Direct Object Reference) attacks
 * 
 * Rules:
 * - ADMINs can access all resources
 * - Users can only access their own resources or resources assigned to them
 * - Prevents users from accessing other users' data
 */

/**
 * Check if user can access a lead
 * Users can access leads assigned to them, ADMINs can access all
 */
export async function canAccessLead(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const leadId = req.params.id;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const organizationId = req.user!.organizationId;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        assignedToId: true,
        organizationId: true
      }
    });

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // Must belong to same org
    if (lead.organizationId !== organizationId) {
      throw new ForbiddenError('You do not have permission to access this lead');
    }

    // ADMINs can access all resources within their org
    if (userRole === 'ADMIN') {
      return next();
    }

    // User can access if it's assigned to them
    if (lead.assignedToId === userId) {
      return next();
    }

    throw new ForbiddenError('You do not have permission to access this lead');
  } catch (error) {
    next(error);
  }
}

/**
 * Check if user can access a task
 */
export async function canAccessTask(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const taskId = req.params.id;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const organizationId = req.user!.organizationId;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        assignedToId: true,
        organizationId: true
      }
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    if (task.organizationId !== organizationId) {
      throw new ForbiddenError('You do not have permission to access this task');
    }

    if (userRole === 'ADMIN') {
      return next();
    }

    if (task.assignedToId === userId) {
      return next();
    }

    throw new ForbiddenError('You do not have permission to access this task');
  } catch (error) {
    next(error);
  }
}

/**
 * Check if user can access an activity
 */
export async function canAccessActivity(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const activityId = req.params.id;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const organizationId = req.user!.organizationId;

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        userId: true,
        organizationId: true
      }
    });

    if (!activity) {
      throw new NotFoundError('Activity not found');
    }

    if (activity.organizationId !== organizationId) {
      throw new ForbiddenError('You do not have permission to access this activity');
    }

    if (userRole === 'ADMIN') {
      return next();
    }

    if (activity.userId === userId) {
      return next();
    }

    throw new ForbiddenError('You do not have permission to access this activity');
  } catch (error) {
    next(error);
  }
}

/**
 * Check if user can access a note
 */
export async function canAccessNote(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const noteId = req.params.id;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const organizationId = req.user!.organizationId;

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: {
        id: true,
        authorId: true,
        lead: {
          select: {
            assignedToId: true,
            organizationId: true
          }
        }
      }
    });

    if (!note) {
      throw new NotFoundError('Note not found');
    }

    if (note.lead?.organizationId !== organizationId) {
      throw new ForbiddenError('You do not have permission to access this note');
    }

    if (userRole === 'ADMIN') {
      return next();
    }

    if (note.authorId === userId || note.lead?.assignedToId === userId) {
      return next();
    }

    throw new ForbiddenError('You do not have permission to access this note');
  } catch (error) {
    next(error);
  }
}

/**
 * Check if user can access a campaign
 */
export async function canAccessCampaign(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const campaignId = req.params.id;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const organizationId = req.user!.organizationId;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        createdById: true,
        organizationId: true
      }
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    if (campaign.organizationId !== organizationId) {
      throw new ForbiddenError('You do not have permission to access this campaign');
    }

    if (userRole === 'ADMIN') {
      return next();
    }

    if (campaign.createdById === userId) {
      return next();
    }

    throw new ForbiddenError('You do not have permission to access this campaign');
  } catch (error) {
    next(error);
  }
}
