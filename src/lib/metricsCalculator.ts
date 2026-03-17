/**
 * Centralized Metrics Calculator — Frontend
 *
 * Single source of truth for all rate/metric calculations on the client.
 * Every component MUST use these functions instead of inline math.
 *
 * Conventions:
 *   - All rates are on the 0–100 scale (percentages).
 *   - Maximum display precision: 2 decimal places (users never see more).
 *   - Default rounding: 1 decimal place.
 *   - Division by zero always returns 0.
 *   - Return type is always `number`. Use `formatRate()` when a string is needed.
 */

const MAX_DECIMALS = 2

// ── Core ────────────────────────────────────────────────────────────────────

/** Safe percentage: (numerator / denominator) * 100, rounded. Capped at MAX_DECIMALS. */
export function calcRate(numerator: number, denominator: number, decimals = 1): number {
  if (denominator <= 0) return 0
  const d = Math.min(decimals, MAX_DECIMALS)
  const raw = (numerator / denominator) * 100
  const factor = Math.pow(10, d)
  return Math.round(raw * factor) / factor
}

/** Same as calcRate but clamps the result to [0, max] (useful for funnel rates). */
export function calcRateClamped(numerator: number, denominator: number, max = 100, decimals = 1): number {
  return Math.min(calcRate(numerator, denominator, decimals), max)
}

/** Format a numeric rate as a fixed-decimal string (e.g. "12.3"). Capped at MAX_DECIMALS. */
export function formatRate(rate: number, decimals = 1): string {
  return rate.toFixed(Math.min(decimals, MAX_DECIMALS))
}

/** Format a monetary value to 2 decimal places (e.g. "4.99"). */
export function formatCurrency(amount: number, decimals = 2): string {
  return amount.toFixed(Math.min(decimals, MAX_DECIMALS))
}

// ── Money display ───────────────────────────────────────────────────────────

const moneyFmtWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const moneyFmt2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Format a number as USD with comma separators.
 * - Whole-dollar display by default (e.g. "$203,109").
 * - Pass `cents: true` for 2-decimal display (e.g. "$203,108.80").
 */
export function fmtMoney(amount: number, opts?: { cents?: boolean }): string {
  return opts?.cents ? moneyFmt2.format(amount) : moneyFmtWhole.format(amount)
}

// ── Campaign metrics (flat denominator = sent) ──────────────────────────────

export function calcOpenRate(opened: number, sent: number): number {
  return calcRate(opened, sent)
}

export function calcClickRate(clicked: number, sent: number): number {
  return calcRate(clicked, sent)
}

export function calcConversionRate(converted: number, sent: number): number {
  return calcRate(converted, sent)
}

export function calcDeliveryRate(delivered: number, sent: number): number {
  return calcRate(delivered, sent)
}

export function calcBounceRate(bounced: number, sent: number): number {
  return calcRate(bounced, sent)
}

export function calcUnsubscribeRate(unsubscribed: number, sent: number): number {
  return calcRate(unsubscribed, sent, 2)
}

// ── Funnel-style metrics ────────────────────────────────────────────────────

/** Click-to-Open Rate (CTOR): clicked / opened. */
export function calcClickToOpenRate(clicked: number, opened: number): number {
  return calcRate(clicked, opened)
}

/** Open rate relative to delivered (funnel metric). */
export function calcOpenRateByDelivered(opened: number, delivered: number): number {
  return calcRate(opened, delivered)
}

// ── ROI ─────────────────────────────────────────────────────────────────────

/** ROI = (revenue - spent) / spent * 100 */
export function calcROI(revenue: number, spent: number): number {
  if (spent <= 0) return 0
  return calcRate(revenue - spent, spent)
}

// ── Lead / pipeline metrics ─────────────────────────────────────────────────

export function calcLeadConversionRate(won: number, total: number): number {
  return calcRate(won, total)
}

// ── Task / completion metrics ───────────────────────────────────────────────

export function calcCompletionRate(completed: number, total: number): number {
  return calcRate(completed, total)
}

// ── Period-over-period change ───────────────────────────────────────────────

/** Percentage change between two values. Returns 100 when previous is 0 and current > 0. */
export function calcPercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return calcRate(current - previous, previous)
}

// ── Progress toward a target ────────────────────────────────────────────────

export function calcProgress(value: number, target: number): number {
  return calcRateClamped(value, target, 100, 0)
}
