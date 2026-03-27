/**
 * Rate limiter tests — we test the exported middleware instances
 * by verifying they are proper Express middleware functions and
 * that the skip callback returns true in test environment
 * (NODE_ENV=test is set in jest.setup.ts).
 */
import {
  generalLimiter,
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  sensitiveLimiter,
  webhookLimiter,
  exportLimiter,
  adminMaintenanceLimiter,
  messageSendLimiter,
  passwordChangeLimiter,
  workflowTriggerLimiter,
} from '../../src/middleware/rateLimiter'

const limiters = [
  ['generalLimiter', generalLimiter],
  ['authLimiter', authLimiter],
  ['registerLimiter', registerLimiter],
  ['passwordResetLimiter', passwordResetLimiter],
  ['sensitiveLimiter', sensitiveLimiter],
  ['webhookLimiter', webhookLimiter],
  ['exportLimiter', exportLimiter],
  ['adminMaintenanceLimiter', adminMaintenanceLimiter],
  ['messageSendLimiter', messageSendLimiter],
  ['passwordChangeLimiter', passwordChangeLimiter],
  ['workflowTriggerLimiter', workflowTriggerLimiter],
] as const

describe('rateLimiter', () => {
  it.each(limiters)('%s is a function (Express middleware)', (name, limiter) => {
    expect(typeof limiter).toBe('function')
  })

  it.each(limiters)('%s calls next() in test environment (skip=true)', async (name, limiter) => {
    const req: any = {
      ip: '127.0.0.1',
      method: 'GET',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      app: { get: jest.fn() },
    }
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    const next = jest.fn()

    await new Promise<void>((resolve) => {
      const wrappedNext = (...args: any[]) => { next(...args); resolve() }
      limiter(req, res, wrappedNext)
      // Also resolve after a short tick in case it calls next synchronously
      setTimeout(resolve, 50)
    })

    expect(next).toHaveBeenCalled()
  })
})
