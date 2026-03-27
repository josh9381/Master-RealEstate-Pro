jest.mock('ua-parser-js', () => {
  const UAParser = jest.fn().mockImplementation((ua: string) => ({
    getResult: jest.fn().mockReturnValue(
      // Minimal defaults overridden per test via mockImplementation
      (UAParser as any).__getResult?.(ua) ?? {
        browser: { name: 'Unknown' },
        os: { name: 'Unknown' },
        device: { type: undefined },
      }
    ),
  }))
  return UAParser
})

import UAParser from 'ua-parser-js'
import { parseUserAgent } from '../../src/utils/useragent'

function setupUAResult(result: object) {
  (UAParser as unknown as jest.Mock).mockImplementation(() => ({
    getResult: jest.fn().mockReturnValue(result),
  }))
}

describe('parseUserAgent', () => {
  beforeEach(() => {
    ;(UAParser as unknown as jest.Mock).mockClear()
  })

  it('returns Unknown for null ua', () => {
    expect(parseUserAgent(null)).toEqual({ deviceType: 'Unknown', browser: 'Unknown', os: 'Unknown' })
    expect(UAParser).not.toHaveBeenCalled()
  })

  it('returns Unknown for undefined ua', () => {
    expect(parseUserAgent(undefined)).toEqual({ deviceType: 'Unknown', browser: 'Unknown', os: 'Unknown' })
  })

  it('returns Unknown for empty string ua', () => {
    expect(parseUserAgent('')).toEqual({ deviceType: 'Unknown', browser: 'Unknown', os: 'Unknown' })
  })

  it('returns Desktop for desktop browser (no device.type)', () => {
    setupUAResult({
      browser: { name: 'Chrome' },
      os: { name: 'Windows' },
      device: { type: undefined },
    })
    expect(parseUserAgent('Mozilla/5.0 ...')).toEqual({ deviceType: 'Desktop', browser: 'Chrome', os: 'Windows' })
  })

  it('returns Mobile for mobile device type', () => {
    setupUAResult({
      browser: { name: 'Safari' },
      os: { name: 'iOS' },
      device: { type: 'mobile' },
    })
    expect(parseUserAgent('iPhone UA')).toEqual({ deviceType: 'Mobile', browser: 'Safari', os: 'iOS' })
  })

  it('returns Mobile for wearable device type', () => {
    setupUAResult({
      browser: { name: 'Chrome' },
      os: { name: 'Android' },
      device: { type: 'wearable' },
    })
    expect(parseUserAgent('Wearable UA')).toEqual({ deviceType: 'Mobile', browser: 'Chrome', os: 'Android' })
  })

  it('returns Tablet for tablet device type', () => {
    setupUAResult({
      browser: { name: 'Safari' },
      os: { name: 'iPadOS' },
      device: { type: 'tablet' },
    })
    expect(parseUserAgent('iPad UA')).toEqual({ deviceType: 'Tablet', browser: 'Safari', os: 'iPadOS' })
  })

  it('returns Unknown for console device type', () => {
    setupUAResult({
      browser: { name: 'PlayStation Browser' },
      os: { name: 'PS4' },
      device: { type: 'console' },
    })
    expect(parseUserAgent('PS4 UA')).toEqual({ deviceType: 'Unknown', browser: 'PlayStation Browser', os: 'PS4' })
  })

  it('falls back to Unknown when browser and os names are missing', () => {
    setupUAResult({
      browser: {},
      os: {},
      device: {},
    })
    expect(parseUserAgent('Unknown UA')).toEqual({ deviceType: 'Desktop', browser: 'Unknown', os: 'Unknown' })
  })
})
