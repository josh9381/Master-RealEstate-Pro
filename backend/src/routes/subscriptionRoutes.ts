import { Router } from 'express';
import { getCurrentSubscription, changePlan, getPlans } from '../controllers/subscriptionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Middleware to check admin role for plan changes
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
  next();
};

// Get current subscription and usage
router.get('/current', getCurrentSubscription);

// Get available plans
router.get('/plans', getPlans);

// Change subscription plan (admin only)
router.post('/change-plan', requireAdmin, changePlan);

export default router;
