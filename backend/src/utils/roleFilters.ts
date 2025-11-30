/**
 * Role-Based Data Filtering Utilities
 * 
 * Implements hierarchical data visibility:
 * - ADMIN: Sees all data in their organization
 * - USER/AGENT: Only sees data assigned to them
 */

import { Role } from '@prisma/client';
import { Request } from 'express';

export interface RoleFilterOptions {
  userId: string;
  role: Role;
  organizationId: string;
}

/**
 * Determines if a user role has full access to all organization data
 */
export function hasFullAccess(role: Role): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

/**
 * Get base where clause for role-based filtering
 * @param options User role information
 * @param additionalWhere Additional where conditions to merge
 */
export function getRoleBasedWhere(
  options: RoleFilterOptions,
  additionalWhere: Record<string, unknown> = {}
): Record<string, unknown> {
  const { role, organizationId, userId } = options;

  // Base filter: always filter by organization
  const baseWhere = {
    organizationId,
    ...additionalWhere,
  };

  // ADMIN/MANAGER: See all organization data
  if (hasFullAccess(role)) {
    return baseWhere;
  }

  // USER/AGENT: Only see assigned data
  return {
    ...baseWhere,
    OR: [
      { assignedToId: userId },  // Explicitly assigned to them
      { createdById: userId },    // Created by them
      { userId: userId },         // Owned by them
    ],
  };
}

/**
 * Extract role filter options from Express request
 */
export function getRoleFilterFromRequest(req: Request): RoleFilterOptions {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  return {
    userId: req.user.userId,
    role: req.user.role as Role,
    organizationId: req.user.organizationId,
  };
}

/**
 * Check if user can access a specific resource
 * @param userRole User's role
 * @param userId User's ID
 * @param resourceOwnerId The ID of the user who owns/created the resource
 * @param resourceAssignedToId The ID of the user the resource is assigned to
 */
export function canAccessResource(
  userRole: Role,
  userId: string,
  resourceOwnerId?: string | null,
  resourceAssignedToId?: string | null
): boolean {
  // ADMIN/MANAGER can access everything
  if (hasFullAccess(userRole)) {
    return true;
  }

  // USER can access if they own it or it's assigned to them
  return (
    userId === resourceOwnerId ||
    userId === resourceAssignedToId
  );
}

/**
 * Get leads filter for role-based access
 */
export function getLeadsFilter(options: RoleFilterOptions, additionalWhere: Record<string, unknown> = {}): Record<string, unknown> {
  const { role, organizationId, userId } = options;

  const baseWhere = {
    organizationId,
    ...additionalWhere,
  };

  // ADMIN/MANAGER: See all leads
  if (hasFullAccess(role)) {
    return baseWhere;
  }

  // USER: Only see leads assigned to them
  return {
    ...baseWhere,
    assignedToId: userId,
  };
}

/**
 * Get campaigns filter for role-based access
 */
export function getCampaignsFilter(options: RoleFilterOptions, additionalWhere: Record<string, unknown> = {}): Record<string, unknown> {
  const { role, organizationId, userId } = options;

  const baseWhere = {
    organizationId,
    ...additionalWhere,
  };

  // ADMIN/MANAGER: See all campaigns
  if (hasFullAccess(role)) {
    return baseWhere;
  }

  // USER: Only see campaigns they created
  return {
    ...baseWhere,
    createdById: userId,
  };
}

/**
 * Get activities filter for role-based access
 */
export function getActivitiesFilter(options: RoleFilterOptions, additionalWhere: Record<string, unknown> = {}): Record<string, unknown> {
  const { role, organizationId, userId } = options;

  const baseWhere = {
    organizationId,
    ...additionalWhere,
  };

  // ADMIN/MANAGER: See all activities
  if (hasFullAccess(role)) {
    return baseWhere;
  }

  // USER: Only see activities for their leads or created by them
  return {
    ...baseWhere,
    OR: [
      { userId: userId },
      { lead: { assignedToId: userId } },
    ],
  };
}

/**
 * Get tasks filter for role-based access
 * Note: Task model doesn't have organizationId, filtered through lead relationship
 */
export function getTasksFilter(options: RoleFilterOptions, additionalWhere: Record<string, unknown> = {}): Record<string, unknown> {
  const { role, userId } = options;

  // ADMIN/MANAGER: See all tasks in organization (through lead.organizationId)
  if (hasFullAccess(role)) {
    return additionalWhere;
  }

  // USER: Only see tasks assigned to them
  return {
    ...additionalWhere,
    assignedToId: userId,
  };
}

/**
 * Get messages filter for role-based access
 */
export function getMessagesFilter(options: RoleFilterOptions, additionalWhere: Record<string, unknown> = {}): Record<string, unknown> {
  const { role, organizationId, userId } = options;

  const baseWhere = {
    organizationId,
    ...additionalWhere,
  };

  // ADMIN/MANAGER: See all messages in organization
  if (hasFullAccess(role)) {
    return baseWhere;
  }

  // USER: Only see messages for leads assigned to them (or messages they created without leads)
  return {
    ...baseWhere,
    OR: [
      {
        lead: {
          assignedToId: userId,
        },
      },
      {
        leadId: null, // Messages without leads (sent to non-lead contacts)
      },
    ],
  };
}
