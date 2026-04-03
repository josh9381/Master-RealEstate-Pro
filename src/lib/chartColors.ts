/**
 * Centralized chart color palette for all analytics and data visualization.
 * Use these constants instead of hardcoding hex colors in individual components.
 *
 * Palettes are designed to be colorblind-safe (distinguishable under
 * protanopia, deuteranopia, and tritanopia) using principles from the
 * Wong (2011) and Tol palettes adapted for web.
 */

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
