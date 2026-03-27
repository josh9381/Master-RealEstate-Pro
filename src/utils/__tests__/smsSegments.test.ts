import { calculateSMSSegments } from '@/utils/smsSegments'

describe('calculateSMSSegments', () => {
  it('returns 0 segments for empty text', () => {
    const result = calculateSMSSegments('')
    expect(result.segmentCount).toBe(0)
    expect(result.charCount).toBe(0)
    expect(result.encoding).toBe('GSM-7')
  })

  it('uses GSM-7 for ASCII text', () => {
    const result = calculateSMSSegments('Hello World')
    expect(result.encoding).toBe('GSM-7')
    expect(result.charCount).toBe(11)
    expect(result.segmentCount).toBe(1)
  })

  it('fits 160 GSM chars in 1 segment', () => {
    const text = 'A'.repeat(160)
    const result = calculateSMSSegments(text)
    expect(result.segmentCount).toBe(1)
    expect(result.charsPerSegment).toBe(160)
  })

  it('splits at 153 chars per segment for multi-part GSM', () => {
    const text = 'A'.repeat(161)
    const result = calculateSMSSegments(text)
    expect(result.segmentCount).toBe(2)
    expect(result.charsPerSegment).toBe(153)
  })

  it('detects UCS-2 for emoji', () => {
    const result = calculateSMSSegments('Hello 😀')
    expect(result.encoding).toBe('UCS-2')
  })

  it('fits 70 UCS-2 chars in 1 segment', () => {
    const text = '你'.repeat(70)
    const result = calculateSMSSegments(text)
    expect(result.encoding).toBe('UCS-2')
    expect(result.segmentCount).toBe(1)
    expect(result.maxSingleSegment).toBe(70)
  })

  it('splits at 67 chars per segment for multi-part UCS-2', () => {
    const text = '你'.repeat(71)
    const result = calculateSMSSegments(text)
    expect(result.segmentCount).toBe(2)
    expect(result.charsPerSegment).toBe(67)
  })

  it('counts GSM extended chars as 2', () => {
    // { and } are GSM extended, cost 2 each
    const result = calculateSMSSegments('{test}')
    expect(result.encoding).toBe('GSM-7')
    expect(result.charCount).toBe(8) // { (2) + t(1) + e(1) + s(1) + t(1) + } (2) = 8
  })

  it('calculates correct segment count for long GSM message', () => {
    const text = 'A'.repeat(306)
    const result = calculateSMSSegments(text)
    expect(result.segmentCount).toBe(2) // 306 / 153 = 2
  })

  it('calculates correct segment count for long UCS-2 message', () => {
    const text = '😀'.repeat(68)
    const result = calculateSMSSegments(text)
    expect(result.encoding).toBe('UCS-2')
    // Each emoji is 2 UTF-16 code units, so 136 chars
    expect(result.segmentCount).toBeGreaterThan(1)
  })
})
