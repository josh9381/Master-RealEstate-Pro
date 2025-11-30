import { Router } from 'express';
import { getAdminStats, getTeamMembers, getActivityLogs } from '../controllers/adminController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Middleware to check admin/manager role
const requireAdminOrManager = (req: any, res: any, next: any) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Access denied. Admin or Manager role required.' });
  }
  next();
};

// Admin statistics
router.get('/stats', requireAdminOrManager, getAdminStats);

// Team members
router.get('/team-members', requireAdminOrManager, getTeamMembers);

// Activity logs
router.get('/activity-logs', requireAdminOrManager, getActivityLogs);

export default router;
