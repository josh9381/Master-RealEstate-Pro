import { CHART_COLORS, LEAD_SOURCE_COLORS, PIPELINE_STAGE_COLORS, LINE_CHART_COLORS, TAG_PICKER_COLORS, getChartColor } from '../chartColors'

describe('getChartColor', () => {
  it('returns the first color for index 0', () => {
    expect(getChartColor(0)).toBe(CHART_COLORS[0])
  })

  it('returns correct color for index 3', () => {
    expect(getChartColor(3)).toBe(CHART_COLORS[3])
  })

  it('cycles back to start for index beyond palette length', () => {
    expect(getChartColor(CHART_COLORS.length)).toBe(CHART_COLORS[0])
  })

  it('handles large index values by cycling', () => {
    const idx = 100
    expect(getChartColor(idx)).toBe(CHART_COLORS[idx % CHART_COLORS.length])
  })
})

describe('color palettes', () => {
  it('CHART_COLORS has 8 colors', () => {
    expect(CHART_COLORS).toHaveLength(8)
  })

  it('LEAD_SOURCE_COLORS has 6 colors', () => {
    expect(LEAD_SOURCE_COLORS).toHaveLength(6)
  })

  it('PIPELINE_STAGE_COLORS has 10 colors', () => {
    expect(PIPELINE_STAGE_COLORS).toHaveLength(10)
  })

  it('all CHART_COLORS are valid hex colors', () => {
    for (const color of CHART_COLORS) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('all CHART_COLORS are unique', () => {
    const unique = new Set(CHART_COLORS)
    expect(unique.size).toBe(CHART_COLORS.length)
  })

  it('LINE_CHART_COLORS has 4 colors', () => {
    expect(LINE_CHART_COLORS).toHaveLength(4)
  })

  it('TAG_PICKER_COLORS has 8 colors', () => {
    expect(TAG_PICKER_COLORS).toHaveLength(8)
  })

  it('all palettes contain valid hex colors', () => {
    const allPalettes = [CHART_COLORS, LEAD_SOURCE_COLORS, PIPELINE_STAGE_COLORS, LINE_CHART_COLORS, TAG_PICKER_COLORS]
    for (const palette of allPalettes) {
      for (const color of palette) {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
      }
    }
  })
})
