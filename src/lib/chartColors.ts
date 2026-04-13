/**
 * Centralized chart color palette for all analytics and data visualization.
 * Use these constants instead of hardcoding hex colors in individual components.
 *
 * Palettes are designed to be colorblind-safe (distinguishable under
 * protanopia, deuteranopia, and tritanopia) using principles from the
 * Wong (2011) and Tol palettes adapted for web.
 */

/**
 * Read a CSS custom property from the document root and convert HSL → hex.
 * Falls back to `fallback` when running outside a browser (SSR/tests)
 * or when the variable is not defined.
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function getCSSColor(varName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${varName}`)
    .trim()
  if (!raw) return fallback
  const parts = raw.split(/\s+/).map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return fallback
  return hslToHex(parts[0], parts[1], parts[2])
}

/** Semantic chart colors that resolve CSS variables at call-time (hex for Recharts) */
export const semanticColors = {
  get primary()     { return getCSSColor('primary',     '#3b82f6') },
  get success()     { return getCSSColor('success',     '#22c55e') },
  get warning()     { return getCSSColor('warning',     '#f59e0b') },
  get destructive() { return getCSSColor('destructive', '#ef4444') },
  get info()        { return getCSSColor('info',        '#3b82f6') },
  get muted()       { return getCSSColor('muted-foreground', '#6b7280') },
} as const

/** Primary 8-color palette for charts, graphs, pie/donut charts (colorblind-safe) */
export const CHART_COLORS = [
  '#0077BB', // strong blue
  '#EE7733', // orange
  '#009988', // teal
  '#CC3311', // vermillion
  '#33BBEE', // cyan
  '#EE3377', // magenta
  '#BBBBBB', // gray
  '#AA3377', // purple
] as const

/** 6-color palette for lead source distribution (colorblind-safe) */
export const LEAD_SOURCE_COLORS = [
  '#0077BB', // strong blue
  '#EE7733', // orange
  '#009988', // teal
  '#CC3311', // vermillion
  '#33BBEE', // cyan
  '#BBBBBB', // gray
] as const

/** 10-color palette for pipeline stages (colorblind-safe) */
export const PIPELINE_STAGE_COLORS = [
  '#BBBBBB', // gray
  '#0077BB', // strong blue
  '#33BBEE', // cyan
  '#AA3377', // purple
  '#EE3377', // magenta
  '#EE7733', // orange
  '#CC3311', // vermillion
  '#DDAA33', // gold
  '#009988', // teal
  '#44BB99', // mint
] as const

/** Line chart stroke colors (4-color for multi-series, colorblind-safe) */
export const LINE_CHART_COLORS = [
  '#0077BB', // strong blue
  '#EE7733', // orange
  '#009988', // teal
  '#CC3311', // vermillion
] as const

/** Tag editor color picker palette */
export const TAG_PICKER_COLORS = [
  '#0077BB', // strong blue
  '#009988', // teal
  '#AA3377', // purple
  '#EE7733', // orange
  '#CC3311', // vermillion
  '#EE3377', // magenta
  '#44BB99', // mint
  '#33BBEE', // cyan
] as const

/** Helper: get a chart color by index, cycling if needed */
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}

/** Default color for pipeline stages when none is set */
export const DEFAULT_STAGE_COLOR = '#6B7280'

/** Default primary color for email templates */
export const DEFAULT_EMAIL_PRIMARY = '#0066cc'

/** Link color used in generated email HTML */
export const EMAIL_LINK_COLOR = '#2563eb'

/** Default tag color when none is selected */
export const DEFAULT_TAG_COLOR = '#0077BB'
