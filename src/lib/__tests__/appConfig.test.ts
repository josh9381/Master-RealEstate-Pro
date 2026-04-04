import { APP_NAME, FALLBACK_EMAIL, FALLBACK_NAME } from '../appConfig'

describe('appConfig', () => {
  it('exports APP_NAME as a non-empty string', () => {
    expect(typeof APP_NAME).toBe('string')
    expect(APP_NAME.length).toBeGreaterThan(0)
  })

  it('exports FALLBACK_EMAIL as empty string', () => {
    expect(FALLBACK_EMAIL).toBe('')
  })

  it('exports FALLBACK_NAME as "User"', () => {
    expect(FALLBACK_NAME).toBe('User')
  })
})
