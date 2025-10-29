import { z } from 'zod';

export const enable2FASchema = z.object({
  // No body required - we'll generate the secret
});

export const verify2FASchema = z.object({
  token: z.string().length(6, '2FA token must be 6 digits'),
  secret: z.string().optional() // Temporary secret during setup
});

export const disable2FASchema = z.object({
  password: z.string().min(1, 'Password is required'),
  token: z.string().length(6, '2FA token must be 6 digits')
});
