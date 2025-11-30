/**
 * A/B Testing Service
 * Handles test creation, variant assignment, result tracking, and statistical analysis
 */

import { PrismaClient, ABTestType, ABTestStatus, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateTestInput {
  name: string;
  description?: string;
  type: ABTestType;
  organizationId: string;
  createdBy: string;
  variantA: Prisma.InputJsonValue;
  variantB: Prisma.InputJsonValue;
}

interface TestResult {
  variant: string;
  participantCount: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  conversionRate: number;
}

interface StatisticalSignificance {
  isSignificant: boolean;
  confidence: number;
  winner: 'A' | 'B' | null;
  pValue: number;
}

export class ABTestService {
  /**
   * Create a new A/B test
   */
  async createTest(input: CreateTestInput) {
    return prisma.aBTest.create({
      data: {
        name: input.name,
        description: input.description,
        type: input.type,
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        variantA: input.variantA,
        variantB: input.variantB,
        status: ABTestStatus.DRAFT,
      },
      include: {
        organization: true,
        creator: true,
      },
    });
  }

  /**
   * Start an A/B test
   */
  async startTest(testId: string) {
    return prisma.aBTest.update({
      where: { id: testId },
      data: {
        status: ABTestStatus.RUNNING,
        startDate: new Date(),
      },
    });
  }

  /**
   * Pause an A/B test
   */
  async pauseTest(testId: string) {
    return prisma.aBTest.update({
      where: { id: testId },
      data: { status: ABTestStatus.PAUSED },
    });
  }

  /**
   * Stop/complete an A/B test
   */
  async stopTest(testId: string) {
    const analysis = await this.analyzeTest(testId);
    
    return prisma.aBTest.update({
      where: { id: testId },
      data: {
        status: ABTestStatus.COMPLETED,
        endDate: new Date(),
        winnerId: analysis.winner,
        confidence: analysis.confidence,
      },
    });
  }

  /**
   * Assign a variant to a lead (random 50/50 split)
   */
  assignVariant(_testId: string): 'A' | 'B' {
    return Math.random() < 0.5 ? 'A' : 'B';
  }

  /**
   * Record a test result for a lead
   */
  async recordResult(data: {
    testId: string;
    variant: 'A' | 'B';
    leadId?: string;
    campaignId?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    const result = await prisma.aBTestResult.create({
      data: {
        testId: data.testId,
        variant: data.variant,
        leadId: data.leadId,
        campaignId: data.campaignId,
        metadata: data.metadata || {},
      },
    });

    // Increment participant count
    await prisma.aBTest.update({
      where: { id: data.testId },
      data: {
        participantCount: {
          increment: 1,
        },
      },
    });

    return result;
  }

  /**
   * Record email opened
   */
  async recordOpen(resultId: string) {
    return prisma.aBTestResult.update({
      where: { id: resultId },
      data: { openedAt: new Date() },
    });
  }

  /**
   * Record email clicked
   */
  async recordClick(resultId: string) {
    return prisma.aBTestResult.update({
      where: { id: resultId },
      data: { clickedAt: new Date() },
    });
  }

  /**
   * Record email replied
   */
  async recordReply(resultId: string) {
    return prisma.aBTestResult.update({
      where: { id: resultId },
      data: { repliedAt: new Date() },
    });
  }

  /**
   * Record conversion
   */
  async recordConversion(resultId: string) {
    return prisma.aBTestResult.update({
      where: { id: resultId },
      data: { converted: true },
    });
  }

  /**
   * Get test results
   */
  async getTestResults(testId: string): Promise<{
    variantA: TestResult;
    variantB: TestResult;
  }> {
    const results = await prisma.aBTestResult.findMany({
      where: { testId },
    });

    const variantAResults = results.filter((r) => r.variant === 'A');
    const variantBResults = results.filter((r) => r.variant === 'B');

    return {
      variantA: this.calculateMetrics(variantAResults),
      variantB: this.calculateMetrics(variantBResults),
    };
  }

  /**
   * Calculate metrics for a set of results
   */
  private calculateMetrics(results: Array<{
    variant: string;
    openedAt: Date | null;
    clickedAt: Date | null;
    repliedAt: Date | null;
    converted: boolean;
  }>): TestResult {
    const total = results.length;
    if (total === 0) {
      return {
        variant: results[0]?.variant || 'A',
        participantCount: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        conversionRate: 0,
      };
    }

    const opens = results.filter((r) => r.openedAt).length;
    const clicks = results.filter((r) => r.clickedAt).length;
    const replies = results.filter((r) => r.repliedAt).length;
    const conversions = results.filter((r) => r.converted).length;

    return {
      variant: results[0].variant,
      participantCount: total,
      openRate: (opens / total) * 100,
      clickRate: (clicks / total) * 100,
      replyRate: (replies / total) * 100,
      conversionRate: (conversions / total) * 100,
    };
  }

  /**
   * Analyze test and determine winner using statistical significance
   * Uses Chi-square test for proportions
   */
  async analyzeTest(testId: string): Promise<StatisticalSignificance> {
    const { variantA, variantB } = await this.getTestResults(testId);

    // Need at least 30 participants per variant for statistical validity
    if (variantA.participantCount < 30 || variantB.participantCount < 30) {
      return {
        isSignificant: false,
        confidence: 0,
        winner: null,
        pValue: 1,
      };
    }

    // Calculate conversion rates
    const convA = variantA.conversionRate / 100;
    const convB = variantB.conversionRate / 100;
    const nA = variantA.participantCount;
    const nB = variantB.participantCount;

    // Calculate pooled probability
    const conversionsA = Math.round(convA * nA);
    const conversionsB = Math.round(convB * nB);
    const pooledProb = (conversionsA + conversionsB) / (nA + nB);

    // Calculate standard error
    const se = Math.sqrt(pooledProb * (1 - pooledProb) * (1 / nA + 1 / nB));

    // Calculate z-score
    const zScore = Math.abs(convA - convB) / se;

    // Calculate p-value (two-tailed test)
    const pValue = 2 * (1 - this.normalCDF(zScore));

    // Determine significance (p < 0.05 for 95% confidence)
    const isSignificant = pValue < 0.05;
    const confidence = (1 - pValue) * 100;

    // Determine winner
    let winner: 'A' | 'B' | null = null;
    if (isSignificant) {
      winner = convA > convB ? 'A' : 'B';
    }

    return {
      isSignificant,
      confidence: Math.round(confidence * 10) / 10,
      winner,
      pValue,
    };
  }

  /**
   * Normal cumulative distribution function
   * Used for calculating p-values
   */
  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp((-x * x) / 2);
    const prob =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  }

  /**
   * Get all tests for an organization
   */
  async getTestsByOrganization(organizationId: string) {
    return prisma.aBTest.findMany({
      where: { organizationId },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            results: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single test with full details
   */
  async getTestById(testId: string) {
    return prisma.aBTest.findUnique({
      where: { id: testId },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        organization: true,
        results: {
          take: 100,
          orderBy: { createdAt: 'desc' },
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Delete a test (only if in DRAFT status)
   */
  async deleteTest(testId: string) {
    const test = await prisma.aBTest.findUnique({
      where: { id: testId },
    });

    if (test?.status !== ABTestStatus.DRAFT) {
      throw new Error('Can only delete tests in DRAFT status');
    }

    return prisma.aBTest.delete({
      where: { id: testId },
    });
  }
}

// Export singleton instance
let abTestServiceInstance: ABTestService | null = null;

export function getABTestService(): ABTestService {
  if (!abTestServiceInstance) {
    abTestServiceInstance = new ABTestService();
  }
  return abTestServiceInstance;
}
