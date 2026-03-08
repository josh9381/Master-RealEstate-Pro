import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { generateAPIKey, listAPIKeys, revokeAPIKey, getAPIKeyAuditLog } from '../controllers/apiKey.controller';

const router = Router();

router.use(authenticate);

router.get('/', listAPIKeys);
router.post('/', generateAPIKey);
router.delete('/:id', revokeAPIKey);
router.get('/audit', getAPIKeyAuditLog);

export default router;
