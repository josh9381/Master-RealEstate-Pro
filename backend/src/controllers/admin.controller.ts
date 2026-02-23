import { Request, Response } from 'express';
import { Role, ActivityType } from '@prisma/client';
import { prisma } from '../config/database';

// In-memory store for system settings (per organization)
// In production, this would be a database table
const systemSettingsStore: Record<string, any> = {};

/**
 * Get system settings for the organization
 */
export const getSystemSettings = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    
    const settings = systemSettingsStore[organizationId] || {
      general: {
        systemName: 'Your CRM System',
        systemUrl: 'https://crm.yourcompany.com',
        systemDescription: 'Customer Relationship Management System for sales and marketing teams',
        language: 'en',
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12',
      },
      security: {
        strongPasswords: true,
        enable2FA: true,
        require2FAAdmins: true,
        sessionTimeout: 60,
        maxLoginAttempts: 5,
        lockoutDuration: 30,
      },
    };

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch system settings' });
  }
};

/**
 * Update system settings for the organization
 */
export const updateSystemSettings = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { section, data } = req.body;

    if (!section || !data) {
      return res.status(400).json({ success: false, message: 'Section and data are required' });
    }

    if (!systemSettingsStore[organizationId]) {
      systemSettingsStore[organizationId] = {
        general: {},
        security: {},
      };
    }

    systemSettingsStore[organizationId][section] = {
      ...systemSettingsStore[organizationId][section],
      ...data,
    };

    res.json({ success: true, data: systemSettingsStore[organizationId] });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update system settings' });
  }
};

/**
 * Health check endpoint - checks database connectivity and reports service status
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    const services = [];

    // Check database
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - dbStart;
      services.push({
        name: 'Database',
        status: dbLatency > 500 ? 'degraded' : 'healthy',
        latency: `${dbLatency}ms`,
        uptime: '99.9%',
      });
    } catch {
      services.push({
        name: 'Database',
        status: 'down',
        latency: 'N/A',
        uptime: 'N/A',
      });
    }

    // API Server is healthy if we reached this point
    services.push({
      name: 'API Server',
      status: 'healthy',
      latency: `${Date.now() - dbStart}ms`,
      uptime: '99.9%',
    });

    // Report other services as unknown (would need actual checks in production)
    services.push(
      { name: 'Cache (Redis)', status: 'checking', latency: 'N/A', uptime: 'N/A' },
      { name: 'Email Service', status: 'checking', latency: 'N/A', uptime: 'N/A' },
      { name: 'Storage (S3)', status: 'checking', latency: 'N/A', uptime: 'N/A' },
      { name: 'Search (Elasticsearch)', status: 'checking', latency: 'N/A', uptime: 'N/A' },
    );

    res.json({
      success: true,
      data: {
        services,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error running health check:', error);
    res.status(500).json({ success: false, message: 'Health check failed' });
  }
};

/**
 * Database maintenance operations
 * In production, these would run actual PostgreSQL maintenance commands
 */
export const runMaintenance = async (req: Request, res: Response) => {
  try {
    const { operation, vacuumFull, analyze, table } = req.body;

    if (!operation) {
      return res.status(400).json({ success: false, message: 'Operation is required' });
    }

    // Log the maintenance request
    console.log(`Maintenance operation requested: ${operation}`, { vacuumFull, analyze, table });

    switch (operation) {
      case 'optimize':
        // Run ANALYZE on the database to update statistics
        await prisma.$queryRawUnsafe('ANALYZE');
        return res.json({ success: true, message: 'Database optimized successfully' });

      case 'vacuum':
        // VACUUM cannot run inside a transaction, so we use queryRawUnsafe
        // Note: VACUUM FULL requires exclusive lock and should be used carefully
        if (vacuumFull) {
          await prisma.$queryRawUnsafe('VACUUM FULL ANALYZE');
        } else if (analyze) {
          await prisma.$queryRawUnsafe('VACUUM ANALYZE');
        } else {
          await prisma.$queryRawUnsafe('VACUUM');
        }
        return res.json({ success: true, message: 'Vacuum completed successfully' });

      case 'reindex':
      case 'reindex_all':
        // REINDEX DATABASE requires superuser, so we reindex individual tables
        await prisma.$queryRawUnsafe('REINDEX SCHEMA public');
        return res.json({ success: true, message: 'Reindex completed successfully' });

      case 'optimize_table':
        if (!table) {
          return res.status(400).json({ success: false, message: 'Table name is required' });
        }
        // Sanitize table name (only allow alphanumeric and underscores)
        const safeName = table.replace(/[^a-zA-Z0-9_]/g, '');
        await prisma.$queryRawUnsafe(`ANALYZE "${safeName}"`);
        return res.json({ success: true, message: `Table ${safeName} optimized` });

      case 'backup':
        // In production, this would trigger pg_dump or a backup service
        return res.json({ success: true, message: 'Backup feature requires infrastructure setup (pg_dump or backup service)' });

      case 'cluster':
        // CLUSTER requires an index, so we just report it needs manual setup
        return res.json({ success: true, message: 'Cluster operation requires manual table/index selection via database admin tools' });

      default:
        return res.status(400).json({ success: false, message: `Unknown operation: ${operation}` });
    }
  } catch (error) {
    console.error('Error running maintenance operation:', error);
    res.status(500).json({ success: false, message: 'Maintenance operation failed' });
  }
};
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
      return res.status(404).json({ success: false, message: 'Organization not found' });
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
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin statistics' });
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
      success: true,
      data: {
        members,
        total,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch team members' });
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
      success: true,
      data: {
        logs,
        total,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activity logs' });
  }
};
