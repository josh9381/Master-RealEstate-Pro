import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getRefreshTokenExpiryMs,
} from '../../src/utils/jwt'

describe('JWT utilities', () => {
  const userId = 'user-1'
  const email = 'agent@test.com'
  const role = 'ADMIN'
  const orgId = 'org-1'

  describe('generateAccessToken', () => {
    it('returns a string token', () => {
      const token = generateAccessToken(userId, email, role, orgId)
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })
  })

  describe('verifyAccessToken', () => {
    it('verifies a valid access token and returns payload', () => {
      const token = generateAccessToken(userId, email, role, orgId)
      const payload = verifyAccessToken(token)
      expect(payload.userId).toBe(userId)
      expect(payload.email).toBe(email)
      expect(payload.role).toBe(role)
      expect(payload.organizationId).toBe(orgId)
    })

    it('throws on invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow()
    })

    it('throws on tampered token', () => {
      const token = generateAccessToken(userId, email, role, orgId)
      const tampered = token.slice(0, -5) + 'XXXXX'
      expect(() => verifyAccessToken(tampered)).toThrow()
    })
  })

  describe('generateRefreshToken', () => {
    it('returns a valid JWT string', () => {
      const token = generateRefreshToken(userId, orgId, true)
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })
  })

  describe('verifyRefreshToken', () => {
    it('verifies a valid refresh token', () => {
      const token = generateRefreshToken(userId, orgId)
      const payload = verifyRefreshToken(token)
      expect(payload.userId).toBe(userId)
      expect(payload.organizationId).toBe(orgId)
    })

    it('throws on invalid refresh token', () => {
      expect(() => verifyRefreshToken('bad')).toThrow()
    })

    it('rejects access token used as refresh token', () => {
      const accessToken = generateAccessToken(userId, email, role, orgId)
      expect(() => verifyRefreshToken(accessToken)).toThrow()
    })
  })

  describe('decodeToken', () => {
    it('decodes a token without verification', () => {
      const token = generateAccessToken(userId, email, role, orgId)
      const decoded = decodeToken(token)
      expect(decoded).toHaveProperty('userId', userId)
    })

    it('returns null for garbage input', () => {
      const decoded = decodeToken('not.a.jwt')
      expect(decoded).toBeNull()
    })
  })

  describe('getRefreshTokenExpiryMs', () => {
    it('returns 7 days for rememberMe=true', () => {
      expect(getRefreshTokenExpiryMs(true)).toBe(7 * 24 * 60 * 60 * 1000)
    })

    it('returns 1 day for rememberMe=false', () => {
      expect(getRefreshTokenExpiryMs(false)).toBe(1 * 24 * 60 * 60 * 1000)
    })
  })
})
