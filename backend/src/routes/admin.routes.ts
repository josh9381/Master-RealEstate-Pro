import express from 'express';
import {
  getAdminStats,
  getTeamMembers,
  getActivityLogs,
} from '../controllers/admin.controller';

const router = express.Router();

// All routes in this file require authentication
// Auth middleware is applied at the app level when registering this router

// Get admin statistics for the organization
router.get('/stats', getAdminStats);

// Get team members for the organization
router.get('/team-members', getTeamMembers);

// Get activity logs for the organization
router.get('/activity-logs', getActivityLogs);

export default router;
