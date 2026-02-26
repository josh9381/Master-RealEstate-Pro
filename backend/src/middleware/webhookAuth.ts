/**
 * Webhook Signature Verification Middleware (#96)
 * Verifies that webhook requests are authentic (not spoofed).
 * 
 * - Twilio: validates X-Twilio-Signature using auth token
 * - SendGrid: validates using event webhook signing key
 */
import { Request, Response, NextFunction } from 'express';
import twilio from 'twilio';

/**
 * Verify Twilio webhook signature using TWILIO_AUTH_TOKEN.
 * If TWILIO_AUTH_TOKEN is not configured, logs a warning and allows the request
 * (graceful degradation for development/testing).
 */
export function verifyTwilioSignature(req: Request, res: Response, next: NextFunction): void {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    console.warn('[WEBHOOK] TWILIO_AUTH_TOKEN not set — skipping signature verification');
    next();
    return;
  }

  // Build the full URL that Twilio signed against
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['host'] || 'localhost';
  const url = `${protocol}://${host}${req.originalUrl}`;

  const signature = req.headers['x-twilio-signature'] as string;

  if (!signature) {
    console.warn('[WEBHOOK] Missing X-Twilio-Signature header');
    res.status(403).json({ error: 'Missing Twilio signature' });
    return;
  }

  const isValid = twilio.validateRequest(authToken, signature, url, req.body || {});

  if (!isValid) {
    console.warn('[WEBHOOK] Invalid Twilio signature for', req.originalUrl);
    res.status(403).json({ error: 'Invalid Twilio signature' });
    return;
  }

  next();
}

/**
 * Verify SendGrid Event Webhook signature.
 * SendGrid uses ECDSA signature verification with a public key.
 * If SENDGRID_WEBHOOK_VERIFICATION_KEY is not set, skip verification gracefully.
 * 
 * Note: For the basic event webhook, SendGrid doesn't sign by default.
 * This becomes active when "Signed Event Webhook" is enabled in SendGrid settings.
 */
export function verifySendGridSignature(req: Request, res: Response, next: NextFunction): void {
  const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;

  if (!verificationKey) {
    // No verification key configured — skip (graceful degradation)
    // Log once to remind operators to configure it
    if (process.env.NODE_ENV === 'production') {
      console.warn('[WEBHOOK] SENDGRID_WEBHOOK_VERIFICATION_KEY not set — skipping SendGrid signature verification. Set this in production for security.');
    }
    next();
    return;
  }

  // SendGrid signed webhook uses these headers:
  const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] as string;
  const signature = req.headers['x-twilio-email-event-webhook-signature'] as string;

  if (!timestamp || !signature) {
    console.warn('[WEBHOOK] Missing SendGrid signature headers');
    res.status(403).json({ error: 'Missing SendGrid signature headers' });
    return;
  }

  // Verify using crypto (ECDSA with P-256)
  try {
    const crypto = require('crypto');
    const payload = timestamp + JSON.stringify(req.body);
    const decodedKey = Buffer.from(verificationKey, 'base64');

    const verifier = crypto.createVerify('SHA256');
    verifier.update(payload);
    verifier.end();

    const isValid = verifier.verify(
      { key: decodedKey, format: 'der', type: 'spki' },
      Buffer.from(signature, 'base64')
    );

    if (!isValid) {
      console.warn('[WEBHOOK] Invalid SendGrid signature');
      res.status(403).json({ error: 'Invalid SendGrid signature' });
      return;
    }
  } catch (err) {
    console.error('[WEBHOOK] SendGrid signature verification error:', err);
    // In production, reject. In development, allow through.
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ error: 'Signature verification failed' });
      return;
    }
  }

  next();
}
