import {
  getUserItem,
  setUserItem,
  removeUserItem,
  clearUserStorage,
  USER_SCOPED_KEYS,
} from '../userStorage'

describe('userStorage', () => {
  const userId = 'user-123'

  beforeEach(() => {
    localStorage.clear()
  })

  describe('getUserItem', () => {
    it('returns stored value for a user', () => {
      localStorage.setItem(`user_${userId}_emailSignature`, 'sig')
      expect(getUserItem(userId, 'emailSignature')).toBe('sig')
    })

    it('returns null when key does not exist', () => {
      expect(getUserItem(userId, 'emailSignature')).toBeNull()
    })

    it('returns null when userId is undefined', () => {
      expect(getUserItem(undefined, 'emailSignature')).toBeNull()
    })
  })

  describe('setUserItem', () => {
    it('stores a prefixed value', () => {
      setUserItem(userId, 'emailSignature', 'my-sig')
      expect(localStorage.getItem(`user_${userId}_emailSignature`)).toBe('my-sig')
    })

    it('is a no-op when userId is undefined', () => {
      setUserItem(undefined, 'emailSignature', 'my-sig')
      expect(localStorage.length).toBe(0)
    })
  })

  describe('removeUserItem', () => {
    it('removes the prefixed key', () => {
      localStorage.setItem(`user_${userId}_emailSignature`, 'sig')
      removeUserItem(userId, 'emailSignature')
      expect(localStorage.getItem(`user_${userId}_emailSignature`)).toBeNull()
    })

    it('is a no-op when userId is undefined', () => {
      localStorage.setItem(`user_${userId}_emailSignature`, 'sig')
      removeUserItem(undefined, 'emailSignature')
      expect(localStorage.getItem(`user_${userId}_emailSignature`)).toBe('sig')
    })
  })

  describe('clearUserStorage', () => {
    it('removes all known prefixed keys for the user', () => {
      for (const key of USER_SCOPED_KEYS) {
        localStorage.setItem(`user_${userId}_${key}`, 'val')
      }
      clearUserStorage(userId)
      for (const key of USER_SCOPED_KEYS) {
        expect(localStorage.getItem(`user_${userId}_${key}`)).toBeNull()
      }
    })

    it('removes legacy un-prefixed keys', () => {
      for (const key of USER_SCOPED_KEYS) {
        localStorage.setItem(key, 'legacy')
      }
      clearUserStorage(userId)
      for (const key of USER_SCOPED_KEYS) {
        expect(localStorage.getItem(key)).toBeNull()
      }
    })

    it('handles undefined userId gracefully', () => {
      localStorage.setItem('emailSignature', 'legacy')
      clearUserStorage(undefined)
      // Legacy keys still get cleaned up
      expect(localStorage.getItem('emailSignature')).toBeNull()
    })
  })

  describe('USER_SCOPED_KEYS', () => {
    it('is a non-empty array', () => {
      expect(USER_SCOPED_KEYS.length).toBeGreaterThan(0)
    })

    it('contains emailSignature', () => {
      expect(USER_SCOPED_KEYS).toContain('emailSignature')
    })
  })
})
