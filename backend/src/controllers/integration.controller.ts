import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { UnauthorizedError, NotFoundError } from '../middleware/errorHandler';
import { encrypt, decrypt } from '../utils/encryption';

/**
 * List all integrations
 * GET /api/integrations
 */
export async function listIntegrations(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const integrations = await prisma.integration.findMany({
    where: { userId: req.user.userId }
  });

  // Mask credentials
  const safeIntegrations = integrations.map(integration => ({
    ...integration,
    credentials: integration.credentials ? '••••••••' : null
  }));

  res.status(200).json({
    success: true,
    data: { integrations: safeIntegrations }
  });
}

/**
 * Connect an integration
 * POST /api/integrations/:provider/connect
 */
export async function connectIntegration(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { provider } = req.params;
  const { credentials, config } = req.body;

  // Encrypt credentials
  const encryptedCredentials = credentials ? 
    JSON.parse(encrypt(JSON.stringify(credentials))) : null;

  const integration = await prisma.integration.upsert({
    where: {
      userId_provider: {
        userId: req.user.userId,
        provider
      }
    },
    update: {
      isConnected: true,
      credentials: encryptedCredentials,
      config
    },
    create: {
      userId: req.user.userId,
      provider,
      isConnected: true,
      credentials: encryptedCredentials,
      config
    }
  });

  res.status(200).json({
    success: true,
    message: `${provider} integration connected successfully`,
    data: {
      integration: {
        ...integration,
        credentials: '••••••••'
      }
    }
  });
}

/**
 * Disconnect an integration
 * POST /api/integrations/:provider/disconnect
 */
export async function disconnectIntegration(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { provider } = req.params;

  const integration = await prisma.integration.updateMany({
    where: {
      userId: req.user.userId,
      provider
    },
    data: {
      isConnected: false,
      credentials: Prisma.DbNull,
      config: Prisma.DbNull
    }
  });

  if (integration.count === 0) {
    throw new NotFoundError(`${provider} integration not found`);
  }

  res.status(200).json({
    success: true,
    message: `${provider} integration disconnected successfully`
  });
}

/**
 * Get integration status
 * GET /api/integrations/:provider/status
 */
export async function getIntegrationStatus(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { provider } = req.params;

  const integration = await prisma.integration.findUnique({
    where: {
      userId_provider: {
        userId: req.user.userId,
        provider
      }
    }
  });

  if (!integration) {
    res.status(200).json({
      success: true,
      data: {
        provider,
        isConnected: false
      }
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      provider: integration.provider,
      isConnected: integration.isConnected,
      lastSyncAt: integration.lastSyncAt,
      syncStatus: integration.syncStatus
    }
  });
}

/**
 * Trigger integration sync
 * POST /api/integrations/:provider/sync
 */
export async function syncIntegration(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { provider } = req.params;

  const integration = await prisma.integration.findUnique({
    where: {
      userId_provider: {
        userId: req.user.userId,
        provider
      }
    }
  });

  if (!integration || !integration.isConnected) {
    throw new NotFoundError(`${provider} integration not found or not connected`);
  }

  // TODO: Implement actual sync logic per provider
  // For now, just update sync status
  await prisma.integration.update({
    where: {
      userId_provider: {
        userId: req.user.userId,
        provider
      }
    },
    data: {
      syncStatus: 'syncing',
      lastSyncAt: new Date()
    }
  });

  res.status(200).json({
    success: true,
    message: `${provider} sync started (mock mode)`
  });
}
