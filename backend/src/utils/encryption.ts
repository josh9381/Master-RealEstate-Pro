import crypto from 'crypto';

// Master encryption key from environment variable (must be 32 bytes)
const MASTER_ENCRYPTION_KEY = process.env.MASTER_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || 'default-32-byte-key-change-this!';
const ALGORITHM = 'aes-256-gcm';

/**
 * Derive a user-specific encryption key from the master key and userId
 * This ensures that even if one user's data is compromised, others remain safe
 * @param userId - User ID to derive key for
 * @returns 32-byte encryption key specific to this user
 */
function getUserEncryptionKey(userId: string): Buffer {
  // Use HKDF (HMAC-based Key Derivation Function) to derive user-specific key
  return Buffer.from(crypto.hkdfSync(
    'sha256',
    MASTER_ENCRYPTION_KEY,
    userId, // Salt with userId for uniqueness
    'user-api-key-encryption', // Info string for domain separation
    32 // 256 bits = 32 bytes
  ));
}

/**
 * Encrypt sensitive data for a specific user (RECOMMENDED)
 * Uses user-specific derived key for better security isolation
 * @param userId - User ID to encrypt for
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encrypted
 */
export function encryptForUser(userId: string, text: string): string {
  if (!text) return '';
  
  try {
    const key = getUserEncryptionKey(userId);
    
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
 * Decrypt encrypted data for a specific user (RECOMMENDED)
 * Uses user-specific derived key
 * @param userId - User ID to decrypt for
 * @param encryptedData - Encrypted string in format: iv:authTag:encrypted
 * @returns Decrypted plain text
 */
export function decryptForUser(userId: string, encryptedData: string): string {
  if (!encryptedData) return '';
  
  try {
    const key = getUserEncryptionKey(userId);
    
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
 * Encrypt sensitive data (API keys, tokens, etc.)
 * @deprecated Use encryptForUser() instead for better security
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encrypted
 */
export function encrypt(text: string): string {
  if (!text) return '';
  
  try {
    // Ensure encryption key is exactly 32 bytes
    const key = crypto.createHash('sha256').update(MASTER_ENCRYPTION_KEY).digest();
    
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
 * @deprecated Use decryptForUser() instead for better security
 * @param encryptedData - Encrypted string in format: iv:authTag:encrypted
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';
  
  try {
    // Ensure encryption key is exactly 32 bytes
    const key = crypto.createHash('sha256').update(MASTER_ENCRYPTION_KEY).digest();
    
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
 * Mask sensitive data for display (e.g., API keys)
 * Shows first 6 and last 4 characters with dots in between
 * @param value - Sensitive value to mask
 * @returns Masked string (e.g., "AC1234...7890" or "••••••••")
 */
export function maskSensitive(value: string | null | undefined): string {
  if (!value || value.length === 0) return '••••••••';
  
  // If too short, just return dots
  if (value.length < 10) {
    return '•'.repeat(8);
  }
  
  // Show first 6 and last 4 characters
  const first = value.slice(0, 6);
  const last = value.slice(-4);
  const dotsCount = Math.min(value.length - 10, 8); // Max 8 dots
  
  return `${first}${'•'.repeat(dotsCount)}${last}`;
}

/**
 * Hash a value (one-way, for comparison only)
 * @param value - Value to hash
 * @returns Hashed value
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
