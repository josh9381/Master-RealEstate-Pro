import { encrypt, decrypt, encryptForUser, decryptForUser, maskSensitive, hash } from '../../src/utils/encryption'

jest.mock('../../src/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

describe('encryption utilities', () => {
  describe('encrypt/decrypt (legacy)', () => {
    it('encrypts and decrypts a string roundtrip', () => {
      const plaintext = 'my-secret-api-key'
      const encrypted = encrypt(plaintext)
      expect(encrypted).not.toBe(plaintext)
      expect(encrypted.split(':')).toHaveLength(3) // iv:authTag:encrypted
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('returns empty string for empty input', () => {
      expect(encrypt('')).toBe('')
      expect(decrypt('')).toBe('')
    })

    it('produces different ciphertexts for same plaintext (random IV)', () => {
      const text = 'same-secret'
      const enc1 = encrypt(text)
      const enc2 = encrypt(text)
      expect(enc1).not.toBe(enc2) // different IVs
      expect(decrypt(enc1)).toBe(text)
      expect(decrypt(enc2)).toBe(text)
    })

    it('throws on invalid encrypted data format', () => {
      expect(() => decrypt('not-valid-format')).toThrow()
    })

    it('throws on tampered ciphertext', () => {
      const encrypted = encrypt('secret')
      const parts = encrypted.split(':')
      parts[2] = 'ff' + parts[2].slice(2) // tamper ciphertext
      expect(() => decrypt(parts.join(':'))).toThrow()
    })
  })

  describe('encryptForUser/decryptForUser', () => {
    const userId = 'user-123'

    it('encrypts and decrypts per-user roundtrip', () => {
      const plaintext = 'user-specific-secret'
      const encrypted = encryptForUser(userId, plaintext)
      expect(encrypted).not.toBe(plaintext)
      const decrypted = decryptForUser(userId, encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('different users produce different ciphertexts', () => {
      const text = 'shared-secret'
      const enc1 = encryptForUser('user-1', text)
      const enc2 = encryptForUser('user-2', text)
      expect(enc1).not.toBe(enc2)
    })

    it('user-1 cannot decrypt user-2 data', () => {
      const encrypted = encryptForUser('user-1', 'secret')
      expect(() => decryptForUser('user-2', encrypted)).toThrow()
    })

    it('returns empty string for empty input', () => {
      expect(encryptForUser(userId, '')).toBe('')
      expect(decryptForUser(userId, '')).toBe('')
    })
  })

  describe('maskSensitive', () => {
    it('masks a long string showing first 6 and last 4', () => {
      const masked = maskSensitive('ABCDEF1234567890XYZ')
      expect(masked).toMatch(/^ABCDEF.*XYZ$/)
      expect(masked).toContain('•')
    })

    it('returns dots for short strings', () => {
      expect(maskSensitive('short')).toBe('••••••••')
    })

    it('returns dots for null/undefined', () => {
      expect(maskSensitive(null)).toBe('••••••••')
      expect(maskSensitive(undefined)).toBe('••••••••')
      expect(maskSensitive('')).toBe('••••••••')
    })
  })

  describe('hash', () => {
    it('returns a hex string', () => {
      const result = hash('test')
      expect(result).toMatch(/^[a-f0-9]{64}$/)
    })

    it('produces same hash for same input', () => {
      expect(hash('hello')).toBe(hash('hello'))
    })

    it('produces different hash for different input', () => {
      expect(hash('hello')).not.toBe(hash('world'))
    })
  })
})
