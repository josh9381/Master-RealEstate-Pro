jest.mock('geoip-lite', () => ({
  __esModule: true,
  default: {
    lookup: jest.fn(),
  },
}))

import geoip from 'geoip-lite'
import { lookupGeo } from '../../src/utils/geoip'

const mockLookup = geoip.lookup as jest.Mock

describe('lookupGeo', () => {
  beforeEach(() => {
    mockLookup.mockReset()
  })

  it('returns Unknown for null ip', () => {
    const result = lookupGeo(null)
    expect(result).toEqual({ country: 'Unknown', region: 'Unknown', city: 'Unknown', ll: null })
    expect(mockLookup).not.toHaveBeenCalled()
  })

  it('returns Unknown for undefined ip', () => {
    const result = lookupGeo(undefined)
    expect(result).toEqual({ country: 'Unknown', region: 'Unknown', city: 'Unknown', ll: null })
  })

  it('returns Local for localhost 127.0.0.1', () => {
    const result = lookupGeo('127.0.0.1')
    expect(result).toEqual({ country: 'Local', region: 'Local', city: 'Local', ll: null })
    expect(mockLookup).not.toHaveBeenCalled()
  })

  it('returns Local for IPv6 loopback ::1', () => {
    expect(lookupGeo('::1')).toEqual({ country: 'Local', region: 'Local', city: 'Local', ll: null })
  })

  it('returns Local for 10.x.x.x private range', () => {
    expect(lookupGeo('10.0.0.1')).toEqual({ country: 'Local', region: 'Local', city: 'Local', ll: null })
  })

  it('returns Local for 192.168.x.x private range', () => {
    expect(lookupGeo('192.168.1.1')).toEqual({ country: 'Local', region: 'Local', city: 'Local', ll: null })
  })

  it('strips IPv6-mapped IPv4 prefix ::ffff:', () => {
    // ::ffff:127.0.0.1 → stripped to 127.0.0.1 → Local
    expect(lookupGeo('::ffff:127.0.0.1')).toEqual({ country: 'Local', region: 'Local', city: 'Local', ll: null })
  })

  it('returns geo data for a real public IP', () => {
    mockLookup.mockReturnValue({ country: 'US', region: 'CA', city: 'Los Angeles', ll: [34.05, -118.24] })

    const result = lookupGeo('8.8.8.8')
    expect(mockLookup).toHaveBeenCalledWith('8.8.8.8')
    expect(result).toEqual({ country: 'US', region: 'CA', city: 'Los Angeles', ll: [34.05, -118.24] })
  })

  it('returns Unknown when geoip.lookup returns null', () => {
    mockLookup.mockReturnValue(null)
    const result = lookupGeo('8.8.8.8')
    expect(result).toEqual({ country: 'Unknown', region: 'Unknown', city: 'Unknown', ll: null })
  })

  it('falls back to Unknown for missing geo fields', () => {
    mockLookup.mockReturnValue({ country: '', region: '', city: '', ll: null })
    const result = lookupGeo('5.5.5.5')
    expect(result.country).toBe('Unknown')
    expect(result.region).toBe('Unknown')
    expect(result.city).toBe('Unknown')
    expect(result.ll).toBeNull()
  })
})
