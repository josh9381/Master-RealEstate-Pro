import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get admin dashboard statistics
 */
export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Get counts for key metrics
    const [totalUsers, totalLeads, totalCampaigns, totalWorkflows] = await Promise.all([
      prisma.user.count({ where: { organizationId } }),
      prisma.lead.count({ where: { organizationId } }),
      prisma.campaign.count({ where: { organizationId } }),
      prisma.workflow.count({ where: { organizationId } }),
    ]);

    res.json({
      stats: {
        totalUsers,
        totalLeads,
        totalCampaigns,
        totalWorkflows,
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

/**
 * Get team members with their roles
 */
export const getTeamMembers = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const users = await prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute derived permission flags (based on role)
    const members = users.map((u) => ({
      ...u,
      canManageUsers: u.role === 'ADMIN',
      canManageOrg: u.role === 'ADMIN',
      canManageSubscription: u.role === 'ADMIN',
      canViewReports: u.role === 'ADMIN' || u.role === 'MANAGER',
      canManageLeads: u.role === 'ADMIN' || u.role === 'MANAGER',
      canManageCampaigns: u.role === 'ADMIN' || u.role === 'MANAGER',
      canManageWorkflows: u.role === 'ADMIN' || u.role === 'MANAGER',
      canManageIntegrations: u.role === 'ADMIN',
      canExportData: u.role === 'ADMIN',
      canManageSettings: u.role === 'ADMIN',
    }));

    res.json({ members });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
};

/**
 * Get activity logs
 */
export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Get recent workflow executions as activity
    const workflowExecutions = await prisma.workflowExecution.findMany({
      where: {
        workflow: {
          organizationId,
        },
      },
      include: {
        workflow: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const activities = workflowExecutions.map((execution) => ({
      id: execution.id,
      action: `Workflow "${execution.workflow.name}" ${execution.status.toLowerCase()}`,
      resourceType: 'Workflow',
      resourceId: execution.workflowId,
      createdAt: execution.startedAt,
      status: execution.status,
    }));

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
};
