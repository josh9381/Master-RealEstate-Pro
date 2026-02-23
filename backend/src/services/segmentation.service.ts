/**
 * Segmentation Service
 * 
 * Rule-based customer segmentation — create segments with filter criteria,
 * query matching leads, and provide member counts.
 */

import { prisma } from '../config/database';

export interface SegmentRule {
  field: string;        // e.g., 'status', 'score', 'source', 'company', 'createdAt'
  operator: string;     // 'equals', 'notEquals', 'contains', 'greaterThan', 'lessThan', 'in', 'between', 'isNull', 'daysAgo'
  value: any;           // string | number | string[] | { min, max }
}

export interface CreateSegmentInput {
  name: string;
  description?: string;
  rules: SegmentRule[];
  matchType?: 'all' | 'any';
  color?: string;
  organizationId: string;
}

export interface UpdateSegmentInput {
  name?: string;
  description?: string;
  rules?: SegmentRule[];
  matchType?: 'all' | 'any';
  color?: string;
  isActive?: boolean;
}

/**
 * Build Prisma where clause from segment rules
 */
function buildWhereFromRules(rules: SegmentRule[], matchType: string, organizationId: string): any {
  const conditions = rules.map(rule => {
    const { field, operator, value } = rule;

    // Map field names to Prisma Lead model fields
    switch (operator) {
      case 'equals':
        return { [field]: value };
      case 'notEquals':
        return { [field]: { not: value } };
      case 'contains':
        return { [field]: { contains: value, mode: 'insensitive' } };
      case 'notContains':
        return { NOT: { [field]: { contains: value, mode: 'insensitive' } } };
      case 'greaterThan':
        return { [field]: { gt: Number(value) } };
      case 'lessThan':
        return { [field]: { lt: Number(value) } };
      case 'greaterThanOrEqual':
        return { [field]: { gte: Number(value) } };
      case 'lessThanOrEqual':
        return { [field]: { lte: Number(value) } };
      case 'in':
        return { [field]: { in: Array.isArray(value) ? value : [value] } };
      case 'notIn':
        return { [field]: { notIn: Array.isArray(value) ? value : [value] } };
      case 'isNull':
        return value ? { [field]: null } : { [field]: { not: null } };
      case 'between':
        return { [field]: { gte: Number(value.min), lte: Number(value.max) } };
      case 'daysAgo': {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - Number(value));
        return { [field]: { lte: daysAgo } };
      }
      case 'startsWith':
        return { [field]: { startsWith: value, mode: 'insensitive' } };
      case 'endsWith':
        return { [field]: { endsWith: value, mode: 'insensitive' } };
      default:
        return { [field]: value };
    }
  });

  const where: any = { organizationId };
  if (matchType === 'any') {
    where.OR = conditions;
  } else {
    where.AND = conditions;
  }

  return where;
}

/**
 * Create a new segment
 */
export async function createSegment(input: CreateSegmentInput) {
  const { name, description, rules, matchType = 'all', color, organizationId } = input;

  // Count matching leads
  const where = buildWhereFromRules(rules, matchType, organizationId);
  const memberCount = await prisma.lead.count({ where });

  const segment = await prisma.segment.create({
    data: {
      name,
      description,
      rules: rules as any,
      matchType,
      memberCount,
      color,
      organizationId,
    },
  });

  return segment;
}

/**
 * Get all segments for an organization
 */
export async function getSegments(organizationId: string) {
  const segments = await prisma.segment.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });

  return segments;
}

/**
 * Get a single segment by ID
 */
export async function getSegmentById(segmentId: string, organizationId: string) {
  const segment = await prisma.segment.findFirst({
    where: { id: segmentId, organizationId },
  });

  if (!segment) {
    throw new Error('Segment not found');
  }

  return segment;
}

/**
 * Update a segment
 */
export async function updateSegment(segmentId: string, organizationId: string, input: UpdateSegmentInput) {
  const existing = await prisma.segment.findFirst({
    where: { id: segmentId, organizationId },
  });

  if (!existing) {
    throw new Error('Segment not found');
  }

  // Recalculate member count if rules changed
  let memberCount = existing.memberCount;
  if (input.rules) {
    const matchType = input.matchType || (existing.matchType as 'all' | 'any');
    const where = buildWhereFromRules(input.rules, matchType, organizationId);
    memberCount = await prisma.lead.count({ where });
  }

  const segment = await prisma.segment.update({
    where: { id: segmentId },
    data: {
      ...input,
      rules: input.rules ? (input.rules as any) : undefined,
      memberCount,
    },
  });

  return segment;
}

/**
 * Delete a segment
 */
export async function deleteSegment(segmentId: string, organizationId: string) {
  const existing = await prisma.segment.findFirst({
    where: { id: segmentId, organizationId },
  });

  if (!existing) {
    throw new Error('Segment not found');
  }

  await prisma.segment.delete({ where: { id: segmentId } });
}

/**
 * Get leads matching a segment's rules
 */
export async function getSegmentMembers(
  segmentId: string,
  organizationId: string,
  options?: { page?: number; limit?: number }
) {
  const segment = await getSegmentById(segmentId, organizationId);
  const rules = segment.rules as unknown as SegmentRule[];
  const matchType = segment.matchType as 'all' | 'any';
  const where = buildWhereFromRules(rules, matchType, organizationId);

  const page = options?.page || 1;
  const limit = options?.limit || 50;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        status: true,
        score: true,
        source: true,
        value: true,
        createdAt: true,
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return { leads, total, page, limit };
}

/**
 * Refresh member counts for all segments in an org
 */
export async function refreshSegmentCounts(organizationId: string) {
  const segments = await prisma.segment.findMany({
    where: { organizationId, isActive: true },
  });

  for (const segment of segments) {
    const rules = segment.rules as unknown as SegmentRule[];
    const matchType = segment.matchType as 'all' | 'any';
    const where = buildWhereFromRules(rules, matchType, organizationId);
    const memberCount = await prisma.lead.count({ where });

    await prisma.segment.update({
      where: { id: segment.id },
      data: { memberCount },
    });
  }
}
