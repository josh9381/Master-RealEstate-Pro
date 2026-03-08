import { Request, Response } from 'express';
import { prisma } from '../config/database';

const DEFAULT_FLAGS = [
  { key: 'ai_lead_scoring', name: 'AI Lead Scoring', description: 'Enable AI-powered lead scoring and predictions', enabled: true, environment: 'production', rollout: 100 },
  { key: 'advanced_analytics', name: 'Advanced Analytics', description: 'Show advanced analytics dashboard and reports', enabled: true, environment: 'production', rollout: 100 },
  { key: 'new_campaign_builder', name: 'New Campaign Builder', description: 'Use redesigned campaign builder interface', enabled: true, environment: 'beta', rollout: 50 },
  { key: 'social_media_integration', name: 'Social Media Integration', description: 'Connect and post to social media platforms', enabled: false, environment: 'development', rollout: 10 },
  { key: 'video_calling', name: 'Video Calling', description: 'Enable in-app video calling feature', enabled: false, environment: 'development', rollout: 0 },
  { key: 'mobile_api_v2', name: 'Mobile App API v2', description: 'Use new mobile API endpoints', enabled: true, environment: 'production', rollout: 75 },
];

/**
 * Get all feature flags for the organization.
 * Seeds defaults on first access.
 */
export const getFeatureFlags = async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;

  let flags = await prisma.featureFlag.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
  });

  // Seed defaults on first access
  if (flags.length === 0) {
    await prisma.featureFlag.createMany({
      data: DEFAULT_FLAGS.map(f => ({ ...f, organizationId })),
    });
    flags = await prisma.featureFlag.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  res.json({ success: true, data: flags });
};

/**
 * Create a new feature flag.
 */
export const createFeatureFlag = async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const { name, key, description, enabled, environment, rollout } = req.body;

  if (!name || !key) {
    return res.status(400).json({ success: false, message: 'Name and key are required' });
  }

  const flag = await prisma.featureFlag.create({
    data: {
      name,
      key,
      description: description || '',
      enabled: enabled ?? false,
      environment: environment || 'development',
      rollout: rollout ?? 0,
      organizationId,
    },
  });

  res.status(201).json({ success: true, data: flag });
};

/**
 * Update a feature flag.
 */
export const updateFeatureFlag = async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const { id } = req.params;

  const existing = await prisma.featureFlag.findFirst({ where: { id, organizationId } });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Feature flag not found' });
  }

  const { name, key, description, enabled, environment, rollout } = req.body;

  const flag = await prisma.featureFlag.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(key !== undefined && { key }),
      ...(description !== undefined && { description }),
      ...(enabled !== undefined && { enabled }),
      ...(environment !== undefined && { environment }),
      ...(rollout !== undefined && { rollout }),
    },
  });

  res.json({ success: true, data: flag });
};

/**
 * Delete a feature flag.
 */
export const deleteFeatureFlag = async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const { id } = req.params;

  const existing = await prisma.featureFlag.findFirst({ where: { id, organizationId } });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Feature flag not found' });
  }

  await prisma.featureFlag.delete({ where: { id } });

  res.json({ success: true, message: 'Feature flag deleted' });
};
