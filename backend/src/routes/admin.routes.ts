import express from 'express';
import {
  getAdminStats,
  getTeamMembers,
  getActivityLogs,
  getSystemSettings,
  updateSystemSettings,
  healthCheck,
  runMaintenance,
  downloadBackup,
} from '../controllers/admin.controller';
import {
  getFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
} from '../controllers/featureFlag.controller';
import { adminMaintenanceLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validate';
import { updateSystemSettingsSchema, runMaintenanceSchema } from '../validators/admin.validator';

const router = express.Router();

// All routes in this file require authentication
// Auth middleware is applied at the app level when registering this router

// Get admin statistics for the organization
router.get('/stats', getAdminStats);

// Get team members for the organization
router.get('/team-members', getTeamMembers);

// Get activity logs for the organization
router.get('/activity-logs', getActivityLogs);

// System settings
router.get('/system-settings', getSystemSettings);
router.put('/system-settings', validateBody(updateSystemSettingsSchema), updateSystemSettings);

// Health check
router.get('/health', healthCheck);

// Database maintenance
router.post('/maintenance', adminMaintenanceLimiter, validateBody(runMaintenanceSchema), runMaintenance);

// Backup download
router.get('/backups/:backupId/download', downloadBackup);

// Feature flags
router.get('/feature-flags', getFeatureFlags);
router.post('/feature-flags', createFeatureFlag);
router.put('/feature-flags/:id', updateFeatureFlag);
router.delete('/feature-flags/:id', deleteFeatureFlag);

export default router;
