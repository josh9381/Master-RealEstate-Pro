/**
 * Centralized chart color palette for all analytics and data visualization.
 * Use these constants instead of hardcoding hex colors in individual components.
 */

/** Primary 8-color palette for charts, graphs, pie/donut charts */
export const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
] as const

/** 6-color palette for lead source distribution */
export const LEAD_SOURCE_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
  '#6b7280', // gray-500
] as const

/** 10-color palette for pipeline stages */
export const PIPELINE_STAGE_COLORS = [
  '#6B7280', // gray
  '#3B82F6', // blue
  '#06B6D4', // cyan
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#F59E0B', // amber
  '#EF4444', // red
  '#F97316', // orange
  '#10B981', // emerald
  '#14B8A6', // teal
] as const

/** Line chart stroke colors (4-color for multi-series) */
export const LINE_CHART_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
] as const

/** Tag editor color picker palette */
export const TAG_PICKER_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#8B5CF6', // violet
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
  '#14B8A6', // teal
  '#6366F1', // indigo
] as const

/** Helper: get a chart color by index, cycling if needed */
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}
