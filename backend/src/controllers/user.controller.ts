import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, UnauthorizedError, ValidationError } from '../middleware/errorHandler';
import { Role } from '@prisma/client';

/**
 * Get all users in the organization
 * GET /api/users
 * Requires: ADMIN or MANAGER role
 */
export const getUsers = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { organizationId, role } = req.user;

  // Only ADMIN and MANAGER can list users
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    throw new UnauthorizedError('Only administrators and managers can view users');
  }

  const users = await prisma.user.findMany({
    where: {
      organizationId: organizationId,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.status(200).json({
    success: true,
    data: {
      users,
      total: users.length,
    },
  });
};

/**
 * Get single user
 * GET /api/users/:id
 */
export const getUser = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.params;
  const { organizationId, role, userId } = req.user;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      avatar: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Users can only view users in their organization
  if (user.organizationId !== organizationId) {
    throw new UnauthorizedError('Cannot access users from other organizations');
  }

  // Non-admins can only view themselves
  if (role === 'USER' && userId !== id) {
    throw new UnauthorizedError('Insufficient permissions');
  }

  res.status(200).json({
    success: true,
    data: { user },
  });
};

/**
 * Update user role
 * PATCH /api/users/:id/role
 * Requires: ADMIN role only
 */
export const updateUserRole = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.params;
  const { role: newRole } = req.body;
  const { organizationId, role: currentUserRole, userId } = req.user;

  // Only ADMIN can change roles
  if (currentUserRole !== 'ADMIN') {
    throw new UnauthorizedError('Only administrators can change user roles');
  }

  // Validate new role
  const validRoles: Role[] = ['ADMIN', 'MANAGER', 'USER'];
  if (!validRoles.includes(newRole as Role)) {
    throw new ValidationError('Invalid role. Must be ADMIN, MANAGER, or USER');
  }

  // Get the user to update
  const userToUpdate = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      organizationId: true,
      role: true,
    },
  });

  if (!userToUpdate) {
    throw new NotFoundError('User not found');
  }

  // Can only update users in the same organization
  if (userToUpdate.organizationId !== organizationId) {
    throw new UnauthorizedError('Cannot modify users from other organizations');
  }

  // Prevent self-demotion (admins can't remove their own admin role)
  if (userToUpdate.id === userId && newRole !== 'ADMIN') {
    throw new ValidationError('You cannot remove your own administrator privileges');
  }

  // Update the user's role
  const updatedUser = await prisma.user.update({
    where: { id },
    data: { role: newRole as Role },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(200).json({
    success: true,
    message: `User role updated to ${newRole}`,
    data: { user: updatedUser },
  });
};

/**
 * Update user profile
 * PATCH /api/users/:id
 */
export const updateUser = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.params;
  const { firstName, lastName, avatar } = req.body;
  const { organizationId, role, userId } = req.user;

  // Get the user
  const userToUpdate = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!userToUpdate) {
    throw new NotFoundError('User not found');
  }

  // Check organization access
  if (userToUpdate.organizationId !== organizationId) {
    throw new UnauthorizedError('Cannot modify users from other organizations');
  }

  // Users can only update themselves unless they're ADMIN/MANAGER
  if (role === 'USER' && userId !== id) {
    throw new UnauthorizedError('Insufficient permissions');
  }

  // Build update data
  const updateData: any = {};
  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (avatar !== undefined) updateData.avatar = avatar;

  // Update the user
  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: { user: updatedUser },
  });
};

/**
 * Delete user
 * DELETE /api/users/:id
 * Requires: ADMIN role only
 */
export const deleteUser = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.params;
  const { organizationId, role, userId } = req.user;

  // Only ADMIN can delete users
  if (role !== 'ADMIN') {
    throw new UnauthorizedError('Only administrators can delete users');
  }

  // Get the user
  const userToDelete = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      email: true,
    },
  });

  if (!userToDelete) {
    throw new NotFoundError('User not found');
  }

  // Check organization access
  if (userToDelete.organizationId !== organizationId) {
    throw new UnauthorizedError('Cannot delete users from other organizations');
  }

  // Prevent self-deletion
  if (userToDelete.id === userId) {
    throw new ValidationError('You cannot delete your own account');
  }

  // Delete the user (Note: This might fail if there are foreign key constraints)
  // In production, you might want to soft-delete or transfer ownership of data
  await prisma.user.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
};
