import { registerSchema, loginSchema, refreshSchema, verify2FASchema } from '../../src/validators/auth.validator'

describe('auth.validator', () => {
  describe('registerSchema', () => {
    const valid = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'Password1',
      tosAccepted: true,
    }

    it('accepts valid registration data', () => {
      expect(registerSchema.safeParse(valid).success).toBe(true)
    })

    it('accepts optional companyName', () => {
      expect(registerSchema.safeParse({ ...valid, companyName: 'Acme' }).success).toBe(true)
    })

    it('rejects missing firstName', () => {
      const { firstName, ...rest } = valid
      expect(registerSchema.safeParse(rest).success).toBe(false)
    })

    it('rejects missing email', () => {
      const { email, ...rest } = valid
      expect(registerSchema.safeParse(rest).success).toBe(false)
    })

    it('rejects invalid email', () => {
      expect(registerSchema.safeParse({ ...valid, email: 'bad' }).success).toBe(false)
    })

    it('rejects short password', () => {
      expect(registerSchema.safeParse({ ...valid, password: 'Pa1' }).success).toBe(false)
    })

    it('rejects password without uppercase', () => {
      expect(registerSchema.safeParse({ ...valid, password: 'password1' }).success).toBe(false)
    })

    it('rejects password without lowercase', () => {
      expect(registerSchema.safeParse({ ...valid, password: 'PASSWORD1' }).success).toBe(false)
    })

    it('rejects password without number', () => {
      expect(registerSchema.safeParse({ ...valid, password: 'Passwordx' }).success).toBe(false)
    })

    it('accepts tosAccepted field', () => {
      expect(registerSchema.safeParse({ ...valid, tosAccepted: true }).success).toBe(true)
    })
  })

  describe('loginSchema', () => {
    it('accepts valid login', () => {
      expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true)
    })

    it('accepts optional twoFactorCode', () => {
      expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x', twoFactorCode: '123456' }).success).toBe(true)
    })

    it('rejects missing password', () => {
      expect(loginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false)
    })
  })

  describe('refreshSchema', () => {
    it('accepts valid token', () => {
      expect(refreshSchema.safeParse({ refreshToken: 'tok' }).success).toBe(true)
    })

    it('rejects empty token', () => {
      expect(refreshSchema.safeParse({ refreshToken: '' }).success).toBe(false)
    })
  })

  describe('verify2FASchema', () => {
    it('accepts valid 6-digit code', () => {
      expect(verify2FASchema.safeParse({ email: 'a@b.com', code: '123456' }).success).toBe(true)
    })

    it('rejects non-digit code', () => {
      expect(verify2FASchema.safeParse({ email: 'a@b.com', code: 'abcdef' }).success).toBe(false)
    })

    it('rejects short code', () => {
      expect(verify2FASchema.safeParse({ email: 'a@b.com', code: '123' }).success).toBe(false)
    })
  })
})
