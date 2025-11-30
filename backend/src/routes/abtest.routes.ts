/**
 * A/B Testing Routes
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createTest,
  getTests,
  getTest,
  getTestResults,
  startTest,
  pauseTest,
  stopTest,
  deleteTest,
  recordInteraction,
} from '../controllers/abtest.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Test management
router.post('/', createTest);
router.get('/', getTests);
router.get('/:id', getTest);
router.delete('/:id', deleteTest);

// Test control
router.post('/:id/start', startTest);
router.post('/:id/pause', pauseTest);
router.post('/:id/stop', stopTest);

// Results and tracking
router.get('/:id/results', getTestResults);
router.post('/:id/interaction', recordInteraction);

export default router;
