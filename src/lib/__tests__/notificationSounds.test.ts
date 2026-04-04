vi.mock('@/lib/userStorage', () => ({
  getUserItem: vi.fn(),
  setUserItem: vi.fn(),
}))

import { getSoundSettings, saveSoundSettings } from '../notificationSounds'
import { getUserItem, setUserItem } from '@/lib/userStorage'

describe('notificationSounds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSoundSettings', () => {
    it('returns default settings when nothing is stored', () => {
      ;(getUserItem as ReturnType<typeof vi.fn>).mockReturnValue(null)
      const settings = getSoundSettings('user-1')
      expect(settings).toMatchObject({
        enabled: true,
        volume: 0.5,
      })
      expect(settings.events).toBeDefined()
      expect(settings.events['new-lead']).toBe(true)
    })

    it('returns stored settings when available', () => {
      const stored = JSON.stringify({ enabled: false, volume: 0.3, events: { 'new-lead': false } })
      ;(getUserItem as ReturnType<typeof vi.fn>).mockReturnValue(stored)
      const settings = getSoundSettings('user-1')
      expect(settings.enabled).toBe(false)
      expect(settings.volume).toBe(0.3)
    })

    it('handles undefined userId', () => {
      ;(getUserItem as ReturnType<typeof vi.fn>).mockReturnValue(null)
      const settings = getSoundSettings(undefined)
      expect(settings).toMatchObject({ enabled: true })
    })
  })

  describe('saveSoundSettings', () => {
    it('saves settings via userStorage', () => {
      const settings = { enabled: true, volume: 0.8, events: { 'new-lead': true } as Record<string, boolean> }
      saveSoundSettings('user-1', settings)
      expect(setUserItem).toHaveBeenCalledWith('user-1', expect.any(String), expect.any(String))
    })
  })
})
