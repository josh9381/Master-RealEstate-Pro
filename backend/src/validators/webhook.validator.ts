/**
 * Webhook Validation Schemas (#95)
 * Zod schemas for Twilio and SendGrid webhook payloads.
 */
import { z } from 'zod';

/**
 * Twilio inbound SMS webhook payload
 */
export const twilioSmsWebhookSchema = z.object({
  MessageSid: z.string().min(1, 'MessageSid is required'),
  From: z.string().min(1, 'From is required'),
  To: z.string().min(1, 'To is required'),
  Body: z.string().default(''),
  NumMedia: z.string().optional(),
  AccountSid: z.string().optional(),
  ApiVersion: z.string().optional(),
  FromCity: z.string().optional(),
  FromState: z.string().optional(),
  FromCountry: z.string().optional(),
  FromZip: z.string().optional(),
}).passthrough(); // Allow additional Twilio fields

/**
 * Twilio SMS status callback payload
 */
export const twilioStatusWebhookSchema = z.object({
  MessageSid: z.string().min(1, 'MessageSid is required'),
  MessageStatus: z.string().min(1, 'MessageStatus is required'),
  ErrorCode: z.string().optional(),
  AccountSid: z.string().optional(),
  From: z.string().optional(),
  To: z.string().optional(),
}).passthrough();

/**
 * SendGrid event webhook — array of events
 * Each event has at minimum an event type and sg_message_id
 */
export const sendgridEventSchema = z.object({
  event: z.string().min(1),
  sg_message_id: z.string().optional(),
  email: z.string().optional(),
  url: z.string().optional(),
  timestamp: z.number().optional(),
  useragent: z.string().optional(),
  user_agent: z.string().optional(),
  ip: z.string().optional(),
  category: z.union([z.string(), z.array(z.string())]).optional(),
  reason: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
}).passthrough();

/**
 * Full SendGrid webhook body is an array of events
 */
export const sendgridWebhookSchema = z.union([
  z.array(sendgridEventSchema),
  sendgridEventSchema,
]);

/**
 * SendGrid Inbound Parse webhook (form-encoded)
 */
export const sendgridInboundSchema = z.object({
  from: z.string().default(''),
  to: z.string().default(''),
  subject: z.string().default('(no subject)'),
  text: z.string().default(''),
  html: z.string().default(''),
  envelope: z.string().optional(),
  charsets: z.string().optional(),
  SPF: z.string().optional(),
  sender_ip: z.string().optional(),
}).passthrough();
