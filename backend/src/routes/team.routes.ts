import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  listTeams,
  createTeam,
  getTeam,
  updateTeam,
  deleteTeam,
  listMembers,
  inviteMember,
  removeMember,
  updateMemberRole
} from '../controllers/team.controller';
import {
  createTeamSchema,
  updateTeamSchema,
  inviteMemberSchema,
  updateMemberRoleSchema
} from '../validators/team.validator';

const router = Router();

// All team routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/teams
 * @desc    List user's teams
 * @access  Private
 */
router.get('/', asyncHandler(listTeams));

/**
 * @route   POST /api/teams
 * @desc    Create team
 * @access  Private
 */
router.post('/', validateBody(createTeamSchema), asyncHandler(createTeam));

/**
 * @route   GET /api/teams/:id
 * @desc    Get team details
 * @access  Private
 */
router.get('/:id', asyncHandler(getTeam));

/**
 * @route   PUT /api/teams/:id
 * @desc    Update team
 * @access  Private
 */
router.put('/:id', validateBody(updateTeamSchema), asyncHandler(updateTeam));

/**
 * @route   DELETE /api/teams/:id
 * @desc    Delete team
 * @access  Private
 */
router.delete('/:id', asyncHandler(deleteTeam));

/**
 * @route   GET /api/teams/:id/members
 * @desc    List team members
 * @access  Private
 */
router.get('/:id/members', asyncHandler(listMembers));

/**
 * @route   POST /api/teams/:id/invite
 * @desc    Invite team member
 * @access  Private
 */
router.post('/:id/invite', validateBody(inviteMemberSchema), asyncHandler(inviteMember));

/**
 * @route   DELETE /api/teams/:id/members/:userId
 * @desc    Remove team member
 * @access  Private
 */
router.delete('/:id/members/:userId', asyncHandler(removeMember));

/**
 * @route   PATCH /api/teams/:id/members/:userId/role
 * @desc    Update member role
 * @access  Private
 */
router.patch('/:id/members/:userId/role', validateBody(updateMemberRoleSchema), asyncHandler(updateMemberRole));

export default router;
