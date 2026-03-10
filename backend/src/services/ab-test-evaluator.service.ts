/**
 * A/B Test Auto-Winner Evaluator Service
 * 
 * Evaluates A/B test results after the configured evaluation period,
 * selects a winner based on the chosen metric (open rate or click rate),
 * and updates the ABTest record.
 */

import { logger } from '../lib/logger'
import { prisma } from '../config/database';

export type WinnerMetric = 'open_rate' | 'click_rate';

export interface VariantStats {
  variant: string;
  total: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
}

export interface ABTestEvaluation {
  testId: string;
  variantA: VariantStats;
  variantB: VariantStats;
  winner: 'A' | 'B' | 'TIE';
  winnerMetric: WinnerMetric;
  confidence: number;
  marginPercent: number;
}

/**
 * Get per-variant statistics for an A/B test by querying ABTestResult rows.
 * Falls back to CampaignLead data if ABTestResult engagement tracking is sparse.
 */
export async function getVariantStats(testId: string): Promise<{ A: VariantStats; B: VariantStats }> {
  const results = await prisma.aBTestResult.findMany({
    where: { testId },
    select: {
      variant: true,
      openedAt: true,
      clickedAt: true,
    },
  });

  const stats: Record<string, VariantStats> = {
    A: { variant: 'A', total: 0, opened: 0, clicked: 0, bounced: 0, openRate: 0, clickRate: 0 },
    B: { variant: 'B', total: 0, opened: 0, clicked: 0, bounced: 0, openRate: 0, clickRate: 0 },
  };

  for (const r of results) {
    const v = r.variant === 'A' ? 'A' : 'B';
    stats[v].total++;
    if (r.openedAt) stats[v].opened++;
    if (r.clickedAt) stats[v].clicked++;
  }

  // Calculate rates
  for (const v of ['A', 'B']) {
    if (stats[v].total > 0) {
      stats[v].openRate = (stats[v].opened / stats[v].total) * 100;
      stats[v].clickRate = (stats[v].clicked / stats[v].total) * 100;
    }
  }

  return { A: stats.A, B: stats.B };
}

/**
 * Calculate confidence level using a simplified proportions z-test.
 * Returns a value between 0 and 1 representing statistical confidence.
 */
function calculateConfidence(
  rateA: number,
  nA: number,
  rateB: number,
  nB: number
): number {
  if (nA === 0 || nB === 0) return 0;

  const pA = rateA / 100;
  const pB = rateB / 100;
  const pPool = (pA * nA + pB * nB) / (nA + nB);

  if (pPool === 0 || pPool === 1) return 0;

  const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));
  if (se === 0) return 0;

  const z = Math.abs(pA - pB) / se;

  // Approximate the two-tailed p-value from z using the error function approximation
  // confidence = 1 - p-value
  const p = 2 * (1 - normalCDF(z));
  return Math.round((1 - p) * 1000) / 1000; // 3 decimal places
}

/**
 * Standard normal CDF approximation (Abramowitz & Stegun)
 */
function normalCDF(z: number): number {
  if (z < -8) return 0;
  if (z > 8) return 1;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  const y = 1.0 - poly * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

/**
 * Evaluate an A/B test and determine the winner.
 */
export async function evaluateABTest(
  testId: string,
  metric: WinnerMetric = 'open_rate'
): Promise<ABTestEvaluation> {
  const { A, B } = await getVariantStats(testId);

  const rateA = metric === 'open_rate' ? A.openRate : A.clickRate;
  const rateB = metric === 'open_rate' ? B.openRate : B.clickRate;

  const confidence = calculateConfidence(rateA, A.total, rateB, B.total);
  const marginPercent = A.total > 0 || B.total > 0
    ? Math.abs(rateA - rateB)
    : 0;

  let winner: 'A' | 'B' | 'TIE';
  if (rateA === rateB || confidence < 0.5) {
    winner = 'TIE';
  } else if (rateA > rateB) {
    winner = 'A';
  } else {
    winner = 'B';
  }

  return {
    testId,
    variantA: A,
    variantB: B,
    winner,
    winnerMetric: metric,
    confidence,
    marginPercent: Math.round(marginPercent * 10) / 10,
  };
}

/**
 * Declare the winner of an A/B test and update the ABTest record.
 */
export async function declareWinner(
  testId: string,
  winnerVariant: 'A' | 'B' | 'TIE',
  metric: WinnerMetric,
  confidence: number
): Promise<void> {
  await prisma.aBTest.update({
    where: { id: testId },
    data: {
      status: 'COMPLETED',
      winnerVariant,
      winnerMetric: metric,
      confidence,
      endDate: new Date(),
    },
  });

  logger.info(`[A/B TEST] Winner declared for test ${testId}: Variant ${winnerVariant} (${metric}, confidence: ${(confidence * 100).toFixed(1)}%)`);
}

/**
 * Process all RUNNING A/B tests that have passed their evaluation window.
 * Called by the campaign scheduler on each cycle.
 */
export async function processABTestAutoWinners(): Promise<void> {
  const now = new Date();

  // Find all RUNNING A/B tests
  const runningTests = await prisma.aBTest.findMany({
    where: { status: 'RUNNING' },
    include: {
      results: {
        select: { id: true },
        take: 1, // just to check if there are results
      },
    },
  });

  if (runningTests.length === 0) return;

  for (const test of runningTests) {
    try {
      if (test.results.length === 0) continue; // No results yet

      // Find the campaign linked to this test
      const campaignResult = await prisma.aBTestResult.findFirst({
        where: { testId: test.id },
        select: { campaignId: true },
      });

      if (!campaignResult?.campaignId) continue;

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignResult.campaignId },
        select: {
          abTestEvalHours: true,
          abTestWinnerMetric: true,
          lastSentAt: true,
          createdAt: true,
        },
      });

      if (!campaign) continue;

      const evalHours = campaign.abTestEvalHours || 24; // Default 24 hours
      const metric = (campaign.abTestWinnerMetric || 'open_rate') as WinnerMetric;

      // Calculate when the test started (use startDate, lastSentAt, or createdAt)
      const testStart = test.startDate || campaign.lastSentAt || campaign.createdAt;
      const evalDeadline = new Date(testStart.getTime() + evalHours * 60 * 60 * 1000);

      if (now < evalDeadline) {
        logger.info(`[A/B TEST] Test ${test.id} not yet ready for evaluation (deadline: ${evalDeadline.toISOString()})`);
        continue;
      }

      // Evaluate and declare winner
      const evaluation = await evaluateABTest(test.id, metric);
      await declareWinner(test.id, evaluation.winner, metric, evaluation.confidence);

      logger.info(
        `[A/B TEST] Auto-winner for test ${test.id}: ` +
        `Variant ${evaluation.winner} ` +
        `(A: ${evaluation.variantA.openRate.toFixed(1)}% open / ${evaluation.variantA.clickRate.toFixed(1)}% click, ` +
        `B: ${evaluation.variantB.openRate.toFixed(1)}% open / ${evaluation.variantB.clickRate.toFixed(1)}% click)`
      );
    } catch (err) {
      logger.error(`[A/B TEST] Error evaluating test ${test.id}:`, err);
    }
  }
}
