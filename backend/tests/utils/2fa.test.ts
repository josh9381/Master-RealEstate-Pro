import { generate2FASecret, verify2FAToken, generate2FAToken, generateBackupCodes } from '../../src/utils/2fa'

jest.mock('../../src/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

describe('2FA utilities', () => {
  describe('generate2FASecret', () => {
    it('returns secret and otpauthUrl', () => {
      const result = generate2FASecret('user@test.com')
      expect(result).toHaveProperty('secret')
      expect(result).toHaveProperty('otpauthUrl')
      expect(typeof result.secret).toBe('string')
      expect(result.secret.length).toBeGreaterThan(0)
    })

    it('includes email in otpauthUrl', () => {
      const result = generate2FASecret('john@example.com')
      expect(decodeURIComponent(result.otpauthUrl!)).toContain('john@example.com')
    })

    it('includes app name in otpauthUrl', () => {
      const result = generate2FASecret('user@test.com')
      expect(result.otpauthUrl).toContain('Master')
    })
  })

  describe('verify2FAToken', () => {
    it('verifies a valid token', () => {
      const { secret } = generate2FASecret('user@test.com')
      const token = generate2FAToken(secret)
      expect(verify2FAToken(token, secret)).toBe(true)
    })

    it('rejects an invalid token', () => {
      const { secret } = generate2FASecret('user@test.com')
      expect(verify2FAToken('000000', secret)).toBe(false)
    })

    it('rejects empty token', () => {
      const { secret } = generate2FASecret('user@test.com')
      expect(verify2FAToken('', secret)).toBe(false)
    })
  })

  describe('generate2FAToken', () => {
    it('returns a 6-digit string', () => {
      const { secret } = generate2FASecret('user@test.com')
      const token = generate2FAToken(secret)
      expect(token).toMatch(/^\d{6}$/)
    })
  })

  describe('generateBackupCodes', () => {
    it('generates 10 codes by default', () => {
      const codes = generateBackupCodes()
      expect(codes).toHaveLength(10)
    })

    it('generates specified number of codes', () => {
      const codes = generateBackupCodes(5)
      expect(codes).toHaveLength(5)
    })

    it('codes are 8 characters long', () => {
      const codes = generateBackupCodes()
      codes.forEach(code => {
        expect(code).toHaveLength(8)
      })
    })

    it('codes are unique', () => {
      const codes = generateBackupCodes(20)
      const uniqueCodes = new Set(codes)
      expect(uniqueCodes.size).toBe(20)
    })
  })
})
