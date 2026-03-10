import { Router } from 'express';
import { webhookLimiter } from '../middleware/rateLimiter';
import { verifyTwilioSignature, verifySendGridSignature } from '../middleware/webhookAuth';
import {
  handleTwilioSms,
  handleTwilioStatus,
  handleSendGridEvent,
  handleSendGridInbound,
  handleWorkflowTrigger,
  handleStripeWebhook,
} from '../controllers/webhook.controller';

const router = Router();

// Apply webhook rate limiter to all webhook routes (#90)
router.use(webhookLimiter);

router.post('/twilio/sms/:userId', verifyTwilioSignature, handleTwilioSms);
router.post('/twilio/status', verifyTwilioSignature, handleTwilioStatus);
router.post('/sendgrid', verifySendGridSignature, handleSendGridEvent);
router.post('/sendgrid/inbound', handleSendGridInbound);
router.post('/workflow/:webhookKey', handleWorkflowTrigger);
router.post('/stripe', handleStripeWebhook);

export default router;

