import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { logAPIKeyAccess } from '../utils/apiKeyAudit';

/**
 * Generate a new API key for the authenticated user's organization.
 * The raw key is returned ONCE — only the hash is stored.
 */
export const generateAPIKey = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const organizationId = req.user!.organizationId;
  const { name, expiresAt } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Key name is required' });
  }

  // Generate a cryptographically secure key
  const rawKey = `mrep_${crypto.randomBytes(32).toString('hex')}`;
  const keyPrefix = rawKey.slice(0, 12); // e.g. "mrep_abc1def2"
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const apiKey = await prisma.aPIKey.create({
    data: {
      name: name.trim(),
      keyHash,
      keyPrefix,
      userId,
      organizationId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  await logAPIKeyAccess(userId, 'api-key', 'created', req, organizationId);

  // Return the raw key ONLY on creation
  res.status(201).json({
    success: true,
    data: {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey, // Only shown once
      keyPrefix: apiKey.keyPrefix,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    },
  });
};

/**
 * List all API keys for the organization.
 * Never returns the raw key — only prefix and metadata.
 */
export const listAPIKeys = async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;

  const keys = await prisma.aPIKey.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: keys });
};

/**
 * Revoke (soft-delete) an API key.
 */
export const revokeAPIKey = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const organizationId = req.user!.organizationId;
  const { id } = req.params;

  const key = await prisma.aPIKey.findFirst({
    where: { id, organizationId },
  });

  if (!key) {
    return res.status(404).json({ success: false, message: 'API key not found' });
  }

  await prisma.aPIKey.update({
    where: { id },
    data: { isActive: false },
  });

  await logAPIKeyAccess(userId, 'api-key', 'deleted', req, organizationId);

  res.json({ success: true, message: 'API key revoked' });
};

/**
 * Get audit log for API key operations.
 */
export const getAPIKeyAuditLog = async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;

  const logs = await prisma.aPIKeyAudit.findMany({
    where: { organizationId, provider: 'api-key' },
    select: {
      id: true,
      action: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json({ success: true, data: logs });
};
