import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getUsers,
  getUser,
  updateUserRole,
  updateUser,
  deleteUser,
} from '../controllers/user.controller';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticate);

/**
 * @route   GET /api/users
 * @desc    Get all users in organization (ADMIN/MANAGER only)
 * @access  Private (ADMIN/MANAGER)
 */
router.get('/', getUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get single user
 * @access  Private (ADMIN/MANAGER or self)
 */
router.get('/:id', getUser);

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Update user role (ADMIN only)
 * @access  Private (ADMIN)
 */
router.patch('/:id/role', updateUserRole);

/**
 * @route   PATCH /api/users/:id
 * @desc    Update user profile
 * @access  Private (ADMIN/MANAGER or self)
 */
router.patch('/:id', updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (ADMIN only)
 * @access  Private (ADMIN)
 */
router.delete('/:id', deleteUser);

export default router;
