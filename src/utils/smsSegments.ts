/**
 * Calculate the number of SMS segments a message will use.
 *
 * GSM-7 encoding: up to 160 chars/segment (or 153 in multi-part).
 * UCS-2 encoding (emoji, non-GSM): up to 70 chars/segment (or 67 in multi-part).
 */

// GSM 7-bit basic character set
const GSM_BASIC = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
  'ÄÖÑÜabcdefghijklmnopqrstuvwxyzäöñüà'
)

// GSM extended chars cost 2 bytes each
const GSM_EXTENDED = new Set('|^€{}[]~\\')

/** Returns true if every character in `text` fits in the GSM-7 charset. */
function isGSMEncoding(text: string): boolean {
  for (const char of text) {
    if (!GSM_BASIC.has(char) && !GSM_EXTENDED.has(char)) return false
  }
  return true
}

/** Count the GSM-7 "septets" (extended chars count as 2). */
function gsmLength(text: string): number {
  let len = 0
  for (const char of text) {
    len += GSM_EXTENDED.has(char) ? 2 : 1
  }
  return len
}

/** Count UCS-2 code units (for emoji, uses string length which counts UTF-16 code units). */
function ucs2Length(text: string): number {
  return text.length
}

export interface SegmentInfo {
  encoding: 'GSM-7' | 'UCS-2'
  charCount: number
  segmentCount: number
  charsPerSegment: number
  maxSingleSegment: number
}

export function calculateSMSSegments(text: string): SegmentInfo {
  if (!text) {
    return { encoding: 'GSM-7', charCount: 0, segmentCount: 0, charsPerSegment: 160, maxSingleSegment: 160 }
  }

  const gsm = isGSMEncoding(text)

  if (gsm) {
    const chars = gsmLength(text)
    const singleLimit = 160
    const multiLimit = 153
    return {
      encoding: 'GSM-7',
      charCount: chars,
      segmentCount: chars <= singleLimit ? 1 : Math.ceil(chars / multiLimit),
      charsPerSegment: chars <= singleLimit ? singleLimit : multiLimit,
      maxSingleSegment: singleLimit,
    }
  } else {
    const chars = ucs2Length(text)
    const singleLimit = 70
    const multiLimit = 67
    return {
      encoding: 'UCS-2',
      charCount: chars,
      segmentCount: chars <= singleLimit ? 1 : Math.ceil(chars / multiLimit),
      charsPerSegment: chars <= singleLimit ? singleLimit : multiLimit,
      maxSingleSegment: singleLimit,
    }
  }
}
