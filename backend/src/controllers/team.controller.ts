import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { UnauthorizedError, NotFoundError, ConflictError } from '../middleware/errorHandler';

/**
 * List user's teams
 * GET /api/teams
 */
export async function listTeams(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const teamMembers = await prisma.teamMember.findMany({
    where: { userId: req.user.userId },
    include: {
      team: true
    }
  });

  const teams = teamMembers.map(tm => ({
    ...tm.team,
    role: tm.role,
    joinedAt: tm.joinedAt
  }));

  res.status(200).json({
    success: true,
    data: { teams }
  });
}

/**
 * Create team
 * POST /api/teams
 */
export async function createTeam(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { name, slug: providedSlug } = req.body;

  // Auto-generate slug from name if not provided
  const slug = providedSlug || name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  // Ensure slug is unique by appending number if needed
  let finalSlug = slug;
  let counter = 1;
  while (await prisma.team.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  // Create team and add creator as OWNER
  const team = await prisma.team.create({
    data: {
      name,
      slug: finalSlug,
      members: {
        create: {
          userId: req.user.userId,
          role: 'OWNER'
        }
      }
    },
    include: {
      members: true
    }
  });

  res.status(201).json({
    success: true,
    message: 'Team created successfully',
    data: { team }
  });
}

/**
 * Get team details
 * GET /api/teams/:id
 */
export async function getTeam(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.params;

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          }
        }
      }
    }
  });

  if (!team) {
    throw new NotFoundError('Team not found');
  }

  // Check if user is a member
  const isMember = team.members.some(m => m.userId === req.user!.userId);

  if (!isMember) {
    throw new UnauthorizedError('You are not a member of this team');
  }

  res.status(200).json({
    success: true,
    data: { team }
  });
}

/**
 * Update team
 * PUT /api/teams/:id
 */
export async function updateTeam(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.params;
  const { name, settings } = req.body;

  // Check if user is owner or admin
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: id,
      userId: req.user.userId,
      role: {
        in: ['OWNER', 'ADMIN']
      }
    }
  });

  if (!membership) {
    throw new UnauthorizedError('Only team owners and admins can update team settings');
  }

  const team = await prisma.team.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(settings && { settings })
    }
  });

  res.status(200).json({
    success: true,
    message: 'Team updated successfully',
    data: { team }
  });
}

/**
 * Delete team
 * DELETE /api/teams/:id
 */
export async function deleteTeam(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.params;

  // Check if user is owner
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: id,
      userId: req.user.userId,
      role: 'OWNER'
    }
  });

  if (!membership) {
    throw new UnauthorizedError('Only team owner can delete the team');
  }

  await prisma.team.delete({
    where: { id }
  });

  res.status(200).json({
    success: true,
    message: 'Team deleted successfully'
  });
}

/**
 * List team members
 * GET /api/teams/:id/members
 */
export async function listMembers(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.params;

  // Check if user is a member
  const userMembership = await prisma.teamMember.findFirst({
    where: {
      teamId: id,
      userId: req.user.userId
    }
  });

  if (!userMembership) {
    throw new UnauthorizedError('You are not a member of this team');
  }

  const members = await prisma.teamMember.findMany({
    where: { teamId: id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      }
    }
  });

  res.status(200).json({
    success: true,
    data: { members }
  });
}

/**
 * Invite team member
 * POST /api/teams/:id/invite
 */
export async function inviteMember(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.params;
  const { email, role } = req.body;

  // Check if user has permission to invite
  const userMembership = await prisma.teamMember.findFirst({
    where: {
      teamId: id,
      userId: req.user.userId,
      role: {
        in: ['OWNER', 'ADMIN', 'MANAGER']
      }
    }
  });

  if (!userMembership) {
    throw new UnauthorizedError('You do not have permission to invite members');
  }

  // Find user by email
  const invitedUser = await prisma.user.findUnique({
    where: { email }
  });

  if (!invitedUser) {
    throw new NotFoundError(`User with email ${email} not found`);
  }

  // Check if already a member
  const existingMembership = await prisma.teamMember.findFirst({
    where: {
      teamId: id,
      userId: invitedUser.id
    }
  });

  if (existingMembership) {
    throw new ConflictError('User is already a team member');
  }

  // Add member
  const member = await prisma.teamMember.create({
    data: {
      teamId: id,
      userId: invitedUser.id,
      role: role || 'MEMBER'
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true
        }
      }
    }
  });

  // TODO: Send invitation email

  res.status(201).json({
    success: true,
    message: 'Team member invited successfully',
    data: { member }
  });
}

/**
 * Remove team member
 * DELETE /api/teams/:id/members/:userId
 */
export async function removeMember(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id, userId } = req.params;

  // Check if requester has permission
  const requesterMembership = await prisma.teamMember.findFirst({
    where: {
      teamId: id,
      userId: req.user.userId,
      role: {
        in: ['OWNER', 'ADMIN']
      }
    }
  });

  if (!requesterMembership) {
    throw new UnauthorizedError('Only owners and admins can remove members');
  }

  // Cannot remove the owner
  const targetMembership = await prisma.teamMember.findFirst({
    where: {
      teamId: id,
      userId
    }
  });

  if (targetMembership?.role === 'OWNER') {
    throw new UnauthorizedError('Cannot remove team owner');
  }

  const result = await prisma.teamMember.deleteMany({
    where: {
      teamId: id,
      userId
    }
  });

  if (result.count === 0) {
    throw new NotFoundError('Team member not found');
  }

  res.status(200).json({
    success: true,
    message: 'Team member removed successfully'
  });
}

/**
 * Update member role
 * PATCH /api/teams/:id/members/:userId/role
 */
export async function updateMemberRole(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id, userId } = req.params;
  const { role } = req.body;

  // Check if requester is owner
  const requesterMembership = await prisma.teamMember.findFirst({
    where: {
      teamId: id,
      userId: req.user.userId,
      role: 'OWNER'
    }
  });

  if (!requesterMembership) {
    throw new UnauthorizedError('Only team owner can change member roles');
  }

  // Cannot change owner's role
  const targetMembership = await prisma.teamMember.findFirst({
    where: {
      teamId: id,
      userId
    }
  });

  if (targetMembership?.role === 'OWNER') {
    throw new UnauthorizedError('Cannot change owner role');
  }

  const updatedMember = await prisma.teamMember.updateMany({
    where: {
      teamId: id,
      userId
    },
    data: { role }
  });

  if (updatedMember.count === 0) {
    throw new NotFoundError('Team member not found');
  }

  res.status(200).json({
    success: true,
    message: 'Member role updated successfully'
  });
}
