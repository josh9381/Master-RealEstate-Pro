import { updateBusinessSettingsSchema } from '../../src/validators/settings/business.validator'
import { updateEmailConfigSchema, testEmailSchema } from '../../src/validators/settings/email.validator'
import { updateNotificationSettingsSchema } from '../../src/validators/settings/notification.validator'
import { updateProfileSchema, changePasswordSchema } from '../../src/validators/settings/profile.validator'
import { verify2FASchema, disable2FASchema } from '../../src/validators/settings/security.validator'
import { updateSMSConfigSchema, testSMSSchema } from '../../src/validators/settings/sms.validator'

describe('settings/business.validator', () => {
  it('accepts valid business settings', () => {
    expect(updateBusinessSettingsSchema.safeParse({ companyName: 'Acme Corp' }).success).toBe(true)
  })

  it('accepts website URL', () => {
    expect(updateBusinessSettingsSchema.safeParse({ website: 'https://example.com' }).success).toBe(true)
  })

  it('accepts empty website', () => {
    expect(updateBusinessSettingsSchema.safeParse({ website: '' }).success).toBe(true)
  })

  it('accepts billingEmail', () => {
    expect(updateBusinessSettingsSchema.safeParse({ billingEmail: 'a@b.com' }).success).toBe(true)
  })

  it('rejects invalid billingEmail', () => {
    expect(updateBusinessSettingsSchema.safeParse({ billingEmail: 'bad' }).success).toBe(false)
  })
})

describe('settings/email.validator', () => {
  describe('updateEmailConfigSchema', () => {
    it('accepts sendgrid provider', () => {
      expect(updateEmailConfigSchema.safeParse({ provider: 'sendgrid', apiKey: 'SG.xxx' }).success).toBe(true)
    })

    it('accepts smtp provider', () => {
      expect(updateEmailConfigSchema.safeParse({ provider: 'smtp', smtpHost: 'smtp.example.com', smtpPort: 587 }).success).toBe(true)
    })

    it('rejects port over 65535', () => {
      expect(updateEmailConfigSchema.safeParse({ smtpPort: 70000 }).success).toBe(false)
    })
  })

  describe('testEmailSchema', () => {
    it('accepts valid test email', () => {
      expect(testEmailSchema.safeParse({ to: 'a@b.com' }).success).toBe(true)
    })

    it('rejects invalid email', () => {
      expect(testEmailSchema.safeParse({ to: 'bad' }).success).toBe(false)
    })
  })
})

describe('settings/notification.validator', () => {
  it('accepts toggle settings', () => {
    expect(updateNotificationSettingsSchema.safeParse({
      emailNotifications: true, pushNotifications: false,
    }).success).toBe(true)
  })

  it('accepts channels', () => {
    expect(updateNotificationSettingsSchema.safeParse({
      channels: { leads: true, campaigns: false },
    }).success).toBe(true)
  })
})

describe('settings/profile.validator', () => {
  describe('updateProfileSchema', () => {
    it('accepts valid profile update', () => {
      expect(updateProfileSchema.safeParse({ firstName: 'John', lastName: 'Doe' }).success).toBe(true)
    })

    it('accepts language code', () => {
      expect(updateProfileSchema.safeParse({ language: 'en' }).success).toBe(true)
    })

    it('rejects language code not 2 chars', () => {
      expect(updateProfileSchema.safeParse({ language: 'eng' }).success).toBe(false)
    })
  })

  describe('changePasswordSchema', () => {
    it('accepts valid password change', () => {
      expect(changePasswordSchema.safeParse({
        currentPassword: 'oldpass',
        newPassword: 'NewPass1',
        confirmPassword: 'NewPass1',
      }).success).toBe(true)
    })

    it('rejects mismatched passwords', () => {
      expect(changePasswordSchema.safeParse({
        currentPassword: 'old',
        newPassword: 'NewPass1',
        confirmPassword: 'Different1',
      }).success).toBe(false)
    })

    it('rejects weak password', () => {
      expect(changePasswordSchema.safeParse({
        currentPassword: 'old',
        newPassword: 'weak',
        confirmPassword: 'weak',
      }).success).toBe(false)
    })
  })
})

describe('settings/security.validator', () => {
  describe('verify2FASchema', () => {
    it('accepts valid 6-digit token', () => {
      expect(verify2FASchema.safeParse({ token: '123456' }).success).toBe(true)
    })

    it('rejects token not 6 chars', () => {
      expect(verify2FASchema.safeParse({ token: '12345' }).success).toBe(false)
    })
  })

  describe('disable2FASchema', () => {
    it('accepts valid disable request', () => {
      expect(disable2FASchema.safeParse({ password: 'mypass', token: '123456' }).success).toBe(true)
    })

    it('rejects missing password', () => {
      expect(disable2FASchema.safeParse({ token: '123456' }).success).toBe(false)
    })
  })
})

describe('settings/sms.validator', () => {
  describe('updateSMSConfigSchema', () => {
    it('accepts valid Twilio config', () => {
      expect(updateSMSConfigSchema.safeParse({
        provider: 'twilio',
        accountSid: 'ACxxx',
        phoneNumber: '+15551234567',
      }).success).toBe(true)
    })

    it('rejects invalid phone format', () => {
      expect(updateSMSConfigSchema.safeParse({ phoneNumber: '555' }).success).toBe(false)
    })
  })

  describe('testSMSSchema', () => {
    it('accepts valid test SMS', () => {
      expect(testSMSSchema.safeParse({ to: '+15551234567', message: 'Hello' }).success).toBe(true)
    })

    it('rejects message over 160 chars', () => {
      expect(testSMSSchema.safeParse({ to: '+15551234567', message: 'x'.repeat(161) }).success).toBe(false)
    })
  })
})
