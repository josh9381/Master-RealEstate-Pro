import {
  calcRate,
  calcRateClamped,
  formatRate,
  formatCurrency,
  fmtMoney,
  calcOpenRate,
  calcClickRate,
  calcConversionRate,
  calcDeliveryRate,
  calcBounceRate,
  calcUnsubscribeRate,
  calcClickToOpenRate,
  calcROI,
  calcLeadConversionRate,
  calcCompletionRate,
  calcPercentChange,
  calcProgress,
} from '../metricsCalculator'

describe('calcRate', () => {
  it('computes a simple percentage', () => {
    expect(calcRate(25, 100)).toBe(25)
  })

  it('returns 0 when denominator is 0', () => {
    expect(calcRate(10, 0)).toBe(0)
  })

  it('returns 0 when denominator is negative', () => {
    expect(calcRate(10, -1)).toBe(0)
  })

  it('rounds to 1 decimal by default', () => {
    expect(calcRate(1, 3)).toBe(33.3)
  })

  it('rounds to 2 decimals when requested', () => {
    expect(calcRate(1, 3, 2)).toBe(33.33)
  })

  it('caps decimals at MAX_DECIMALS (2)', () => {
    // Even if you request 5 decimals, should be capped at 2
    expect(calcRate(1, 3, 5)).toBe(33.33)
  })

  it('handles 100% correctly', () => {
    expect(calcRate(100, 100)).toBe(100)
  })

  it('handles values > 100%', () => {
    expect(calcRate(200, 100)).toBe(200)
  })
})

describe('calcRateClamped', () => {
  it('clamps to max (default 100)', () => {
    expect(calcRateClamped(200, 100)).toBe(100)
  })

  it('returns normal rate when under max', () => {
    expect(calcRateClamped(50, 100)).toBe(50)
  })

  it('clamps to custom max', () => {
    expect(calcRateClamped(80, 100, 50)).toBe(50)
  })
})

describe('formatRate', () => {
  it('formats with 1 decimal by default', () => {
    expect(formatRate(33.333)).toBe('33.3')
  })

  it('formats with 2 decimals', () => {
    expect(formatRate(33.333, 2)).toBe('33.33')
  })

  it('pads with zeros', () => {
    expect(formatRate(10, 2)).toBe('10.00')
  })
})

describe('formatCurrency', () => {
  it('formats to 2 decimals by default', () => {
    expect(formatCurrency(4.9)).toBe('4.90')
  })

  it('formats integers', () => {
    expect(formatCurrency(100)).toBe('100.00')
  })
})

describe('fmtMoney', () => {
  it('formats as whole dollars by default', () => {
    expect(fmtMoney(203109)).toBe('$203,109')
  })

  it('formats with cents when requested', () => {
    expect(fmtMoney(203108.8, { cents: true })).toBe('$203,108.80')
  })

  it('formats zero', () => {
    expect(fmtMoney(0)).toBe('$0')
  })

  it('formats negative amounts', () => {
    const result = fmtMoney(-500)
    expect(result).toContain('500')
  })
})

describe('campaign metric helpers', () => {
  it('calcOpenRate delegates to calcRate', () => {
    expect(calcOpenRate(50, 200)).toBe(25)
  })

  it('calcClickRate', () => {
    expect(calcClickRate(10, 100)).toBe(10)
  })

  it('calcConversionRate', () => {
    expect(calcConversionRate(5, 100)).toBe(5)
  })

  it('calcDeliveryRate', () => {
    expect(calcDeliveryRate(95, 100)).toBe(95)
  })

  it('calcBounceRate', () => {
    expect(calcBounceRate(3, 100)).toBe(3)
  })

  it('calcUnsubscribeRate uses 2 decimals', () => {
    expect(calcUnsubscribeRate(1, 300)).toBe(0.33)
  })
})

describe('funnel metrics', () => {
  it('calcClickToOpenRate', () => {
    expect(calcClickToOpenRate(10, 50)).toBe(20)
  })

  it('returns 0 when no opens', () => {
    expect(calcClickToOpenRate(10, 0)).toBe(0)
  })
})

describe('calcROI', () => {
  it('computes positive ROI', () => {
    expect(calcROI(200, 100)).toBe(100)
  })

  it('computes negative ROI', () => {
    expect(calcROI(50, 100)).toBe(-50)
  })

  it('returns 0 when spent is 0', () => {
    expect(calcROI(100, 0)).toBe(0)
  })
})

describe('calcLeadConversionRate', () => {
  it('calculates won/total ratio', () => {
    expect(calcLeadConversionRate(10, 50)).toBe(20)
  })

  it('returns 0 with no leads', () => {
    expect(calcLeadConversionRate(0, 0)).toBe(0)
  })
})

describe('calcCompletionRate', () => {
  it('calculates completed/total ratio', () => {
    expect(calcCompletionRate(7, 10)).toBe(70)
  })
})

describe('calcPercentChange', () => {
  it('calculates positive change', () => {
    expect(calcPercentChange(150, 100)).toBe(50)
  })

  it('calculates negative change', () => {
    expect(calcPercentChange(50, 100)).toBe(-50)
  })

  it('returns 100 when previous is 0 and current > 0', () => {
    expect(calcPercentChange(10, 0)).toBe(100)
  })

  it('returns 0 when both are 0', () => {
    expect(calcPercentChange(0, 0)).toBe(0)
  })
})

describe('calcProgress', () => {
  it('calculates progress percentage', () => {
    expect(calcProgress(50, 100)).toBe(50)
  })

  it('clamps at 100', () => {
    expect(calcProgress(150, 100)).toBe(100)
  })

  it('returns 0 for zero target', () => {
    expect(calcProgress(50, 0)).toBe(0)
  })
})
