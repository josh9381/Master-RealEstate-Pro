import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const APP_NAME = 'Master RealEstate Pro';

/**
 * Generate a new 2FA secret for a user
 * @param userEmail - User's email address
 * @returns Object containing secret and otpauth URL
 */
export function generate2FASecret(userEmail: string) {
  const secret = speakeasy.generateSecret({
    name: `${APP_NAME} (${userEmail})`,
    issuer: APP_NAME,
    length: 32
  });

  return {
    secret: secret.base32, // Store this in database
    otpauthUrl: secret.otpauth_url // Use this to generate QR code
  };
}

/**
 * Generate QR code data URL from otpauth URL
 * @param otpauthUrl - The otpauth URL from generate2FASecret
 * @returns Data URL for QR code image
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataURL;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify a 2FA token against a secret
 * @param token - 6-digit token from authenticator app
 * @param secret - User's stored 2FA secret
 * @param window - Number of time steps to check (default 1 = ±30 seconds)
 * @returns true if token is valid, false otherwise
 */
export function verify2FAToken(token: string, secret: string, window: number = 1): boolean {
  try {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window // Allow some time drift
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return false;
  }
}

/**
 * Generate a 2FA token for testing (don't use in production unless for testing)
 * @param secret - User's stored 2FA secret
 * @returns 6-digit token
 */
export function generate2FAToken(secret: string): string {
  return speakeasy.totp({
    secret,
    encoding: 'base32'
  });
}

/**
 * Generate backup codes for account recovery
 * @param count - Number of backup codes to generate (default 10)
 * @returns Array of backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = speakeasy.generateSecret({ length: 8 }).base32.substring(0, 8);
    codes.push(code);
  }
  
  return codes;
}
