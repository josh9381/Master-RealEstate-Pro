import { PrismaClient, ABTestType, ABTestStatus, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * A/B Testing Service
 * Handles creation, management, and analysis of A/B tests
 */

export interface CreateABTestData {
  name: string
  description?: string
  type: ABTestType
  organizationId: string
  createdBy: string
  variantA: Prisma.InputJsonValue // JSON data for variant A
  variantB: Prisma.InputJsonValue // JSON data for variant B
}

export interface ABTestResult {
  variant: 'A' | 'B'
  totalParticipants: number
  opens: number
  clicks: number
  replies: number
  conversions: number
  openRate: number
  clickRate: number
  replyRate: number
  conversionRate: number
}

export interface ABTestAnalysis {
  testId: string
  testName: string
  status: ABTestStatus
  startDate: Date | null
  endDate: Date | null
  duration: number | null // days
  totalParticipants: number
  variantA: ABTestResult
  variantB: ABTestResult
  winner: 'A' | 'B' | null
  confidence: number | null // 0-100
  improvement: number | null // percentage improvement
}

export class ABTestingService {
  /**
   * Create a new A/B test
   */
  async createTest(data: CreateABTestData) {
    const test = await prisma.aBTest.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        organizationId: data.organizationId,
        createdBy: data.createdBy,
        variantA: data.variantA,
        variantB: data.variantB,
        status: ABTestStatus.DRAFT,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return test
  }

  /**
   * Get all tests for an organization
   */
  async getTests(organizationId: string, status?: ABTestStatus) {
    const where: Prisma.ABTestWhereInput = { organizationId }
    if (status) {
      where.status = status
    }

    const tests = await prisma.aBTest.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    return tests
  }

  /**
   * Get a single test by ID
   */
  async getTest(testId: string, organizationId: string) {
    const test = await prisma.aBTest.findFirst({
      where: {
        id: testId,
        organizationId,
      },
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
    })

    if (!test) {
      throw new Error('Test not found')
    }

    return test
  }

  /**
   * Start an A/B test
   */
  async startTest(testId: string, organizationId: string) {
    const test = await this.getTest(testId, organizationId)

    if (test.status !== ABTestStatus.DRAFT && test.status !== ABTestStatus.PAUSED) {
      throw new Error('Can only start draft or paused tests')
    }

    const updatedTest = await prisma.aBTest.update({
      where: { id: testId },
      data: {
        status: ABTestStatus.RUNNING,
        startDate: test.startDate || new Date(),
      },
    })

    return updatedTest
  }

  /**
   * Pause an A/B test
   */
  async pauseTest(testId: string, organizationId: string) {
    const test = await this.getTest(testId, organizationId)

    if (test.status !== ABTestStatus.RUNNING) {
      throw new Error('Can only pause running tests')
    }

    const updatedTest = await prisma.aBTest.update({
      where: { id: testId },
      data: {
        status: ABTestStatus.PAUSED,
      },
    })

    return updatedTest
  }

  /**
   * Stop/complete an A/B test
   */
  async stopTest(testId: string, organizationId: string) {
    const test = await this.getTest(testId, organizationId)

    if (test.status !== ABTestStatus.RUNNING && test.status !== ABTestStatus.PAUSED) {
      throw new Error('Can only stop running or paused tests')
    }

    // Analyze results before completing
    const analysis = await this.analyzeTest(testId, organizationId)

    const updatedTest = await prisma.aBTest.update({
      where: { id: testId },
      data: {
        status: ABTestStatus.COMPLETED,
        endDate: new Date(),
        winnerId: analysis.winner,
        confidence: analysis.confidence,
      },
    })

    return { test: updatedTest, analysis }
  }

  /**
   * Delete an A/B test
   */
  async deleteTest(testId: string, organizationId: string) {
    const test = await this.getTest(testId, organizationId)

    if (test.status === ABTestStatus.RUNNING) {
      throw new Error('Cannot delete a running test. Please stop it first.')
    }

    await prisma.aBTest.delete({
      where: { id: testId },
    })

    return { success: true }
  }

  /**
   * Assign a participant to a test variant (random 50/50 split)
   */
  async assignVariant(testId: string, leadId?: string, campaignId?: string) {
    const variant = Math.random() < 0.5 ? 'A' : 'B'

    const result = await prisma.aBTestResult.create({
      data: {
        testId,
        variant,
        leadId,
        campaignId,
      },
    })

    // Update participant count
    await prisma.aBTest.update({
      where: { id: testId },
      data: {
        participantCount: {
          increment: 1,
        },
      },
    })

    return { variant, resultId: result.id }
  }

  /**
   * Record an interaction (open, click, reply, conversion)
   */
  async recordInteraction(
    resultId: string,
    type: 'open' | 'click' | 'reply' | 'conversion'
  ) {
    const data: Prisma.ABTestResultUpdateInput = {}

    switch (type) {
      case 'open':
        data.openedAt = new Date()
        break
      case 'click':
        data.clickedAt = new Date()
        break
      case 'reply':
        data.repliedAt = new Date()
        break
      case 'conversion':
        data.converted = true
        break
    }

    const result = await prisma.aBTestResult.update({
      where: { id: resultId },
      data,
    })

    return result
  }

  /**
   * Get results for a specific variant
   */
  private async getVariantResults(testId: string, variant: 'A' | 'B'): Promise<ABTestResult> {
    const results = await prisma.aBTestResult.findMany({
      where: {
        testId,
        variant,
      },
    })

    const totalParticipants = results.length
    const opens = results.filter((r) => r.openedAt).length
    const clicks = results.filter((r) => r.clickedAt).length
    const replies = results.filter((r) => r.repliedAt).length
    const conversions = results.filter((r) => r.converted).length

    return {
      variant,
      totalParticipants,
      opens,
      clicks,
      replies,
      conversions,
      openRate: totalParticipants > 0 ? (opens / totalParticipants) * 100 : 0,
      clickRate: totalParticipants > 0 ? (clicks / totalParticipants) * 100 : 0,
      replyRate: totalParticipants > 0 ? (replies / totalParticipants) * 100 : 0,
      conversionRate: totalParticipants > 0 ? (conversions / totalParticipants) * 100 : 0,
    }
  }

  /**
   * Calculate statistical significance using z-test for proportions
   */
  private calculateSignificance(
    conversionsA: number,
    participantsA: number,
    conversionsB: number,
    participantsB: number
  ): { confidence: number; winner: 'A' | 'B' | null } {
    if (participantsA < 30 || participantsB < 30) {
      return { confidence: 0, winner: null } // Not enough data
    }

    const pA = conversionsA / participantsA
    const pB = conversionsB / participantsB
    const pPool = (conversionsA + conversionsB) / (participantsA + participantsB)

    const sePool = Math.sqrt(pPool * (1 - pPool) * (1 / participantsA + 1 / participantsB))

    if (sePool === 0) {
      return { confidence: 0, winner: null }
    }

    const zScore = Math.abs((pA - pB) / sePool)

    // Convert z-score to confidence level (two-tailed test)
    // z = 1.96 ≈ 95% confidence, z = 2.58 ≈ 99% confidence
    let confidence = 0
    if (zScore >= 2.58) {
      confidence = 99
    } else if (zScore >= 1.96) {
      confidence = 95
    } else if (zScore >= 1.65) {
      confidence = 90
    } else if (zScore >= 1.28) {
      confidence = 80
    } else {
      confidence = Math.min(80, zScore * 40) // Scale for lower z-scores
    }

    // Determine winner (only if confidence >= 90%)
    const winner = confidence >= 90 ? (pA > pB ? 'A' : 'B') : null

    return { confidence, winner }
  }

  /**
   * Analyze A/B test results
   */
  async analyzeTest(testId: string, organizationId: string): Promise<ABTestAnalysis> {
    const test = await this.getTest(testId, organizationId)

    const variantAResults = await this.getVariantResults(testId, 'A')
    const variantBResults = await this.getVariantResults(testId, 'B')

    const totalParticipants = variantAResults.totalParticipants + variantBResults.totalParticipants

    // Calculate statistical significance based on conversion rates
    const { confidence, winner } = this.calculateSignificance(
      variantAResults.conversions,
      variantAResults.totalParticipants,
      variantBResults.conversions,
      variantBResults.totalParticipants
    )

    // Calculate improvement percentage
    let improvement: number | null = null
    if (winner) {
      const winnerRate =
        winner === 'A' ? variantAResults.conversionRate : variantBResults.conversionRate
      const loserRate =
        winner === 'A' ? variantBResults.conversionRate : variantAResults.conversionRate

      if (loserRate > 0) {
        improvement = ((winnerRate - loserRate) / loserRate) * 100
      }
    }

    // Calculate duration
    let duration: number | null = null
    if (test.startDate && test.endDate) {
      duration = Math.ceil(
        (test.endDate.getTime() - test.startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    } else if (test.startDate) {
      duration = Math.ceil((Date.now() - test.startDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    return {
      testId: test.id,
      testName: test.name,
      status: test.status,
      startDate: test.startDate,
      endDate: test.endDate,
      duration,
      totalParticipants,
      variantA: variantAResults,
      variantB: variantBResults,
      winner,
      confidence,
      improvement,
    }
  }
}

// Export singleton instance
let abTestingService: ABTestingService | null = null

export function getABTestingService(): ABTestingService {
  if (!abTestingService) {
    abTestingService = new ABTestingService()
  }
  return abTestingService
}

export default getABTestingService()
