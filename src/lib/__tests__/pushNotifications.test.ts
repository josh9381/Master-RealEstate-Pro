vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

import { isPushSupported, getPushPermission, isPushSubscribed } from '../pushNotifications'

describe('pushNotifications', () => {
  describe('isPushSupported', () => {
    it('returns boolean indicating browser support', () => {
      const result = isPushSupported()
      expect(typeof result).toBe('boolean')
    })

    it('returns false when serviceWorker is not available', () => {
      const orig = navigator.serviceWorker
      Object.defineProperty(navigator, 'serviceWorker', { value: undefined, writable: true, configurable: true })
      expect(isPushSupported()).toBe(false)
      Object.defineProperty(navigator, 'serviceWorker', { value: orig, writable: true, configurable: true })
    })
  })

  describe('getPushPermission', () => {
    it('returns a permission value', async () => {
      const result = await getPushPermission()
      expect(['granted', 'denied', 'default']).toContain(result)
    })
  })

  describe('isPushSubscribed', () => {
    it('returns false when push is not supported', async () => {
      const orig = navigator.serviceWorker
      Object.defineProperty(navigator, 'serviceWorker', { value: undefined, writable: true, configurable: true })
      expect(await isPushSubscribed()).toBe(false)
      Object.defineProperty(navigator, 'serviceWorker', { value: orig, writable: true, configurable: true })
    })
  })
})
