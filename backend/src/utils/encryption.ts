import crypto from 'crypto';

// Encryption key from environment variable (must be 32 bytes)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-byte-key-change-this!'; // Must be 32 chars
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt sensitive data (API keys, tokens, etc.)
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encrypted
 */
export function encrypt(text: string): string {
  if (!text) return '';
  
  try {
    // Ensure encryption key is exactly 32 bytes
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Return format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt encrypted data
 * @param encryptedData - Encrypted string in format: iv:authTag:encrypted
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';
  
  try {
    // Ensure encryption key is exactly 32 bytes
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    
    // Split the encrypted data
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the text
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash a value (one-way, for comparison only)
 * @param value - Value to hash
 * @returns Hashed value
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
