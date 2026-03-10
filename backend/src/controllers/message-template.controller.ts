import { Request, Response } from 'express';
import { prisma } from '../config/database';

// GET /api/message-templates
export async function getMessageTemplates(req: Request, res: Response) {
  const organizationId = req.user!.organizationId;
  const userId = req.user!.userId;
  const { category, isQuickReply, tier } = req.query;

  // Build where clause: user sees SYSTEM + ORGANIZATION + their TEAM + their PERSONAL
  const where: Record<string, any> = {
    isActive: true,
    OR: [
      { tier: 'SYSTEM', organizationId },
      { tier: 'ORGANIZATION', organizationId },
      { tier: 'TEAM', organizationId },
      { tier: 'PERSONAL', organizationId, userId },
    ],
  };

  if (category && typeof category === 'string') {
    where.category = category;
  }
  if (isQuickReply !== undefined) {
    where.isQuickReply = isQuickReply === 'true';
  }
  if (tier && typeof tier === 'string') {
    where.tier = tier;
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const skip = (page - 1) * limit;

  const [templates, total] = await Promise.all([
    prisma.messageTemplate.findMany({
      where,
      orderBy: [{ tier: 'asc' }, { category: 'asc' }, { name: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.messageTemplate.count({ where }),
  ]);

  res.json({ templates, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

// GET /api/message-templates/categories
export async function getCategories(req: Request, res: Response) {
  const organizationId = req.user!.organizationId;

  const categories = await prisma.messageTemplate.findMany({
    where: { organizationId, isActive: true },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  res.json({ categories: categories.map((c: { category: string | null }) => c.category).filter(Boolean) });
}

// POST /api/message-templates
export async function createMessageTemplate(req: Request, res: Response) {
  const organizationId = req.user!.organizationId;
  const userId = req.user!.userId;
  const { name, content, category, tier, isQuickReply, variables, teamId } = req.body;

  // Users can only create PERSONAL or (admin) ORGANIZATION/TEAM templates
  const allowedTier = tier || 'PERSONAL';
  if (allowedTier === 'SYSTEM') {
    return res.status(403).json({ error: 'Cannot create system templates' });
  }

  const template = await prisma.messageTemplate.create({
    data: {
      name,
      content,
      category: category || null,
      tier: allowedTier,
      isQuickReply: isQuickReply || false,
      variables: variables || null,
      organizationId,
      teamId: allowedTier === 'TEAM' ? teamId : null,
      userId: allowedTier === 'PERSONAL' ? userId : null,
    },
  });

  res.status(201).json({ template });
}

// PUT /api/message-templates/:id
export async function updateMessageTemplate(req: Request, res: Response) {
  const organizationId = req.user!.organizationId;
  const userId = req.user!.userId;
  const { id } = req.params;
  const { name, content, category, isQuickReply, variables } = req.body;

  const existing = await prisma.messageTemplate.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Template not found' });
  }

  // Only owner can edit PERSONAL, only admin can edit ORG/TEAM, nobody can edit SYSTEM
  if (existing.tier === 'SYSTEM') {
    return res.status(403).json({ error: 'Cannot edit system templates' });
  }
  if (existing.tier === 'PERSONAL' && existing.userId !== userId) {
    return res.status(403).json({ error: 'Cannot edit another user\'s template' });
  }

  const template = await prisma.messageTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(content !== undefined && { content }),
      ...(category !== undefined && { category }),
      ...(isQuickReply !== undefined && { isQuickReply }),
      ...(variables !== undefined && { variables }),
    },
  });

  res.json({ template });
}

// DELETE /api/message-templates/:id
export async function deleteMessageTemplate(req: Request, res: Response) {
  const organizationId = req.user!.organizationId;
  const userId = req.user!.userId;
  const { id } = req.params;

  const existing = await prisma.messageTemplate.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Template not found' });
  }

  if (existing.tier === 'SYSTEM') {
    return res.status(403).json({ error: 'Cannot delete system templates' });
  }
  if (existing.tier === 'PERSONAL' && existing.userId !== userId) {
    return res.status(403).json({ error: 'Cannot delete another user\'s template' });
  }

  await prisma.messageTemplate.delete({ where: { id } });
  res.json({ success: true });
}

// POST /api/message-templates/seed-defaults
// Seeds default system templates for an org (idempotent)
export async function seedDefaults(req: Request, res: Response) {
  const organizationId = req.user!.organizationId;

  const existingCount = await prisma.messageTemplate.count({
    where: { organizationId, tier: 'SYSTEM' },
  });

  if (existingCount > 0) {
    return res.json({ seeded: false, message: 'System templates already exist' });
  }

  const defaults = [
    // Templates
    { name: 'Schedule a Call', content: 'Hi {{contact}},\n\nI\'d like to schedule a call to discuss this further. What times work best for you this week?\n\nBest regards', category: 'Scheduling', isQuickReply: false },
    { name: 'Request More Info', content: 'Hi {{contact}},\n\nThank you for your message. Could you provide some additional information about the property you\'re interested in?\n\nLooking forward to your response.', category: 'Follow-ups', isQuickReply: false },
    { name: 'Send Pricing', content: 'Hi {{contact}},\n\nThank you for your interest! I\'ve attached the pricing details for {{property}}. Please let me know if you have any questions.\n\nBest regards', category: 'Follow-ups', isQuickReply: false },
    { name: 'Follow-up Reminder', content: 'Hi {{contact}},\n\nI wanted to follow up on our previous conversation about {{property}}. Do you have any updates or questions I can help with?\n\nBest regards', category: 'Follow-ups', isQuickReply: false },
    { name: 'Thank You', content: 'Hi {{contact}},\n\nThank you so much for your time today. I really appreciated our conversation. Please don\'t hesitate to reach out if you need anything.\n\nBest regards', category: 'Greetings', isQuickReply: false },
    { name: 'New Listing Alert', content: 'Hi {{contact}},\n\nI have a new listing that matches your criteria! It\'s a {{propertyType}} located in {{location}}. Would you like to schedule a viewing?\n\nBest regards', category: 'Listings', isQuickReply: false },
    { name: 'Open House Invite', content: 'Hi {{contact}},\n\nYou\'re invited to an open house at {{property}} on {{date}}. Let me know if you can make it!\n\nBest regards', category: 'Scheduling', isQuickReply: false },
    { name: 'Closing Congratulations', content: 'Hi {{contact}},\n\nCongratulations on the closing! It was a pleasure working with you. Please don\'t hesitate to refer me to friends and family.\n\nBest regards', category: 'Closing', isQuickReply: false },
    // Quick Replies
    { name: 'Thanks!', content: 'Thanks! 👍', category: 'Quick', isQuickReply: true },
    { name: 'Will call you soon', content: 'Will call you soon 📞', category: 'Quick', isQuickReply: true },
    { name: 'Received', content: 'Received ✅', category: 'Quick', isQuickReply: true },
    { name: 'Perfect!', content: 'Perfect! 🎉', category: 'Quick', isQuickReply: true },
    { name: 'Got it', content: 'Got it 👌', category: 'Quick', isQuickReply: true },
    { name: 'On my way!', content: 'On my way! 🚗', category: 'Quick', isQuickReply: true },
  ];

  await prisma.messageTemplate.createMany({
    data: defaults.map((d) => ({
      ...d,
      tier: 'SYSTEM' as const,
      organizationId,
    })),
  });

  res.json({ seeded: true, count: defaults.length });
}
