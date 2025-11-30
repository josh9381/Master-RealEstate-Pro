import { Request, Response } from 'express';
import { PrismaClient, Role, ActivityType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get admin statistics for the organization
 * Returns organization info, counts, and system health
 */
export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        logo: true,
        subscriptionTier: true,
        trialEndsAt: true,
        isActive: true,
        createdAt: true,
        domain: true,
        slug: true,
      },
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Count users in organization
    const totalUsers = await prisma.user.count({
      where: { organizationId },
    });

    const activeUsers = await prisma.user.count({
      where: {
        organizationId,
        isActive: true,
      },
    });

    // Count leads
    const totalLeads = await prisma.lead.count({
      where: { organizationId },
    });

    // Count campaigns
    const totalCampaigns = await prisma.campaign.count({
      where: { organizationId },
    });

    const activeCampaigns = await prisma.campaign.count({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
    });

    // Count workflows
    const totalWorkflows = await prisma.workflow.count({
      where: { organizationId },
    });

    const activeWorkflows = await prisma.workflow.count({
      where: {
        organizationId,
        isActive: true,
      },
    });

    // Count messages
    const totalMessages = await prisma.message.count({
      where: { organizationId },
    });

    // Count appointments
    const totalAppointments = await prisma.appointment.count({
      where: { organizationId },
    });

    // Estimate storage (rough calculation based on messages)
    // In reality, you'd calculate actual file sizes if storing attachments
    const estimatedStorageBytes = totalMessages * 5000; // ~5KB per message estimate
    const storageGB = (estimatedStorageBytes / (1024 ** 3)).toFixed(2);

    // Get last backup time (would come from actual backup system)
    // For now, return null
    const lastBackup = null;

    // Calculate API calls (would come from actual logging)
    // For now, return a mock number
    const apiCalls = 0;

    // Mock active sessions count
    // In production, you'd query from a session store (Redis, etc.)
    const activeSessions = await prisma.user.count({
      where: {
        organizationId,
        isActive: true,
        lastLoginAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    // System health (mock data - in production, query from monitoring service)
    const systemHealth = {
      database: 'healthy' as const,
      apiResponseTime: 142, // ms
      uptime: '99.98%',
      errorRate: '0.02%',
    };

    res.json({
      organization,
      stats: {
        totalUsers,
        activeUsers,
        totalLeads,
        totalCampaigns,
        activeCampaigns,
        totalWorkflows,
        activeWorkflows,
        totalMessages,
        totalAppointments,
        storageUsed: `${storageGB} GB`,
        apiCalls,
        lastBackup,
      },
      activeSessions,
      systemHealth,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
};

/**
 * Get team members for the organization
 * Supports filtering by role and pagination
 */
export const getTeamMembers = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { role, limit = '50', offset = '0' } = req.query;

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // Build where clause
    const where: { organizationId: string; role?: Role } = { organizationId };
    if (role && typeof role === 'string') {
      where.role = role as Role;
    }

    // Get team members
    const members = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        avatar: true,
        emailVerified: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      skip: offsetNum,
    });

    // Get total count
    const total = await prisma.user.count({ where });

    res.json({
      members,
      total,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
};

/**
 * Get activity logs for the organization
 * Supports filtering by userId, type, date range, and pagination
 */
export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const userRole = req.user!.role;
    const currentUserId = req.user!.userId;
    
    const {
      userId: filterUserId,
      type,
      startDate,
      endDate,
      limit = '50',
      offset = '0',
    } = req.query;

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // Build where clause
    interface ActivityWhere {
      organizationId: string;
      userId?: string;
      type?: ActivityType;
      createdAt?: { gte?: Date; lte?: Date };
    }
    
    const where: ActivityWhere = { organizationId };

    // Managers can only see their own and their team's activities
    // Admins can see all organization activities
    if (userRole === 'MANAGER' && !filterUserId) {
      where.userId = currentUserId;
    } else if (filterUserId && typeof filterUserId === 'string') {
      where.userId = filterUserId;
    }

    if (type && typeof type === 'string') {
      where.type = type as ActivityType;
    }

    // Date range filter (default to last 30 days if not specified)
    if (startDate && typeof startDate === 'string') {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    } else {
      // Default: last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.createdAt = { ...where.createdAt, gte: thirtyDaysAgo };
    }

    if (endDate && typeof endDate === 'string') {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    // Get activities with user info
    const logs = await prisma.activity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      skip: offsetNum,
    });

    // Get total count
    const total = await prisma.activity.count({ where });

    res.json({
      logs,
      total,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
};
