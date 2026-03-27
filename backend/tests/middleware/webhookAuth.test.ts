jest.mock('twilio', () => ({
  validateRequest: jest.fn(),
}))
jest.mock('../../src/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn() },
}))

import twilio from 'twilio'
import { verifyTwilioSignature, verifySendGridSignature } from '../../src/middleware/webhookAuth'

function makeMocks(overrides: Record<string, any> = {}) {
  const req: any = {
    headers: {},
    protocol: 'https',
    originalUrl: '/api/webhooks/twilio',
    body: { MessageSid: 'SM123' },
    ...overrides,
  }
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('verifyTwilioSignature', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('rejects with 401 when TWILIO_AUTH_TOKEN is not set', () => {
    delete process.env.TWILIO_AUTH_TOKEN
    const { req, res, next } = makeMocks()

    verifyTwilioSignature(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects with 403 when signature header is missing', () => {
    process.env.TWILIO_AUTH_TOKEN = 'test-token'
    const { req, res, next } = makeMocks()

    verifyTwilioSignature(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing Twilio signature' })
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects with 403 when signature is invalid', () => {
    process.env.TWILIO_AUTH_TOKEN = 'test-token'
    ;(twilio.validateRequest as jest.Mock).mockReturnValue(false)
    const { req, res, next } = makeMocks({
      headers: {
        'x-twilio-signature': 'bad-sig',
        host: 'example.com',
      },
    })

    verifyTwilioSignature(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid Twilio signature' })
  })

  it('calls next() when signature is valid', () => {
    process.env.TWILIO_AUTH_TOKEN = 'test-token'
    ;(twilio.validateRequest as jest.Mock).mockReturnValue(true)
    const { req, res, next } = makeMocks({
      headers: {
        'x-twilio-signature': 'valid-sig',
        host: 'example.com',
      },
    })

    verifyTwilioSignature(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})

describe('verifySendGridSignature', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('rejects with 401 when SENDGRID_WEBHOOK_VERIFICATION_KEY is not set', () => {
    delete process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY
    const { req, res, next } = makeMocks()

    verifySendGridSignature(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects with 403 when signature headers are missing', () => {
    process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY = 'key123'
    const { req, res, next } = makeMocks()

    verifySendGridSignature(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing SendGrid signature headers' })
  })
})
