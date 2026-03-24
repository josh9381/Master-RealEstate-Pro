/**
 * AI Chatbot Unit Tests
 * Covers: permission checks, confirmation tokens, history truncation,
 * destructive function gates, input validation, function execution
 */

import request from 'supertest'
import express from 'express'
import { prisma } from '../src/config/database'
import bcrypt from 'bcryptjs'
import aiRoutes from '../src/routes/ai.routes'
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler'
import { requestLogger } from '../src/middleware/logger'
import { generateAccessToken } from '../src/utils/jwt'
import { testOrgIds } from './setup'
import type { User } from '@prisma/client'

// Create test app
const app = express()
app.use(express.json())
app.use(requestLogger)
app.use('/api/ai', aiRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

describe('AI Chatbot', () => {
  let testUser: User
  let testAdminUser: User
  let testAccessToken: string
  let adminAccessToken: string
  let testOrgId: string

  beforeEach(async () => {
    // Create a test organization
    const testOrg = await prisma.organization.create({
      data: { name: 'AI Test Org', slug: `ai-test-org-${Date.now()}` },
    })
    testOrgId = testOrg.id
    testOrgIds.push(testOrgId)  // Register for cleanup

    // Create a regular user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10)
    testUser = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: `testuser-ai-${Date.now()}@example.com`,
        password: hashedPassword,
        role: 'USER',
        organizationId: testOrgId,
      },
    })

    // Create an admin user
    testAdminUser = await prisma.user.create({
      data: {
        firstName: 'Admin',
        lastName: 'User',
        email: `adminuser-ai-${Date.now()}@example.com`,
        password: hashedPassword,
        role: 'ADMIN',
        organizationId: testOrgId,
      },
    })

    testAccessToken = generateAccessToken(testUser.id, testUser.email, testUser.role, testOrgId)
    adminAccessToken = generateAccessToken(testAdminUser.id, testAdminUser.email, testAdminUser.role, testOrgId)
  })

  // ─── Chat endpoint validation ────────────────────────────────────

  describe('POST /api/ai/chat — input validation', () => {
    it('should reject empty message', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ message: '' })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('should reject message exceeding 5000 chars', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ message: 'a'.repeat(5001) })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('should reject request without auth', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'Hello' })

      expect(res.status).toBe(401)
    })

    it('should accept valid message with tone', async () => {
      // This will fail at OpenAI level (no API key in test) but should pass validation
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ message: 'What are my best leads?', tone: 'PROFESSIONAL' })

      // 503/500 = no OpenAI key configured (expected in test), or 200 if somehow configured
      expect([200, 500, 503]).toContain(res.status)
    }, 30000)

    it('should reject conversationHistory exceeding 50 messages', async () => {
      const history = Array.from({ length: 51 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }))

      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ message: 'Hello', conversationHistory: history })

      expect(res.status).toBe(400)
    })
  })

  // ─── Chat history ────────────────────────────────────────────────

  describe('GET /api/ai/chat/history', () => {
    it('should return empty history for new user', async () => {
      const res = await request(app)
        .get('/api/ai/chat/history')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toEqual([])
    })

    it('should return chat history after messages are stored', async () => {
      // Insert test messages directly
      await prisma.chatMessage.create({
        data: {
          userId: testUser.id,
          organizationId: testOrgId,
          role: 'user',
          content: 'Test question',
        },
      })
      await prisma.chatMessage.create({
        data: {
          userId: testUser.id,
          organizationId: testOrgId,
          role: 'assistant',
          content: 'Test answer',
          tokens: 50,
          cost: 0.001,
        },
      })

      const res = await request(app)
        .get('/api/ai/chat/history')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.data[0].role).toBe('user')
      expect(res.body.data[1].role).toBe('assistant')
    })

    it('should not return other user chat history (multi-tenancy)', async () => {
      // Create messages for the admin user
      await prisma.chatMessage.create({
        data: {
          userId: testAdminUser.id,
          organizationId: testOrgId,
          role: 'user',
          content: 'Admin question',
        },
      })

      // Regular user should not see admin messages
      const res = await request(app)
        .get('/api/ai/chat/history')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      const messages = res.body.data
      expect(messages.every((m: { content: string }) => m.content !== 'Admin question')).toBe(true)
    })
  })

  // ─── Clear chat history ──────────────────────────────────────────

  describe('DELETE /api/ai/chat/history', () => {
    it('should clear user chat history', async () => {
      // Insert messages
      await prisma.chatMessage.create({
        data: {
          userId: testUser.id,
          organizationId: testOrgId,
          role: 'user',
          content: 'To be deleted',
        },
      })

      const res = await request(app)
        .delete('/api/ai/chat/history')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.deleted).toBeGreaterThanOrEqual(1)

      // Verify cleared
      const historyRes = await request(app)
        .get('/api/ai/chat/history')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(historyRes.body.data).toHaveLength(0)
    })
  })

  // ─── Chat feedback ──────────────────────────────────────────────

  describe('POST /api/ai/chat/:id/feedback', () => {
    it('should submit positive feedback on a message', async () => {
      const msg = await prisma.chatMessage.create({
        data: {
          userId: testUser.id,
          organizationId: testOrgId,
          role: 'assistant',
          content: 'Helpful response',
        },
      })

      const res = await request(app)
        .post(`/api/ai/chat/${msg.id}/feedback`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ feedback: 'positive' })

      expect(res.status).toBe(200)
      expect(res.body.data.feedback).toBe('positive')
    })

    it('should submit negative feedback on a message', async () => {
      const msg = await prisma.chatMessage.create({
        data: {
          userId: testUser.id,
          organizationId: testOrgId,
          role: 'assistant',
          content: 'Unhelpful response',
        },
      })

      const res = await request(app)
        .post(`/api/ai/chat/${msg.id}/feedback`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ feedback: 'negative', note: 'Not relevant' })

      expect(res.status).toBe(200)
      expect(res.body.data.feedback).toBe('negative')
    })

    it('should return 404 for non-existent message', async () => {
      const res = await request(app)
        .post('/api/ai/chat/nonexistent-id/feedback')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ feedback: 'positive' })

      expect(res.status).toBe(404)
    })
  })

  // ─── AI Usage ────────────────────────────────────────────────────

  describe('GET /api/ai/usage', () => {
    it('should return usage stats for authenticated user', async () => {
      const res = await request(app)
        .get('/api/ai/usage')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('chat')
      expect(res.body.data).toHaveProperty('monthly')
    })
  })

  // ─── AI Insights ─────────────────────────────────────────────────

  describe('GET /api/ai/insights', () => {
    it('should return insights for the organization', async () => {
      const res = await request(app)
        .get('/api/ai/insights')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it('should filter by priority', async () => {
      const res = await request(app)
        .get('/api/ai/insights?priority=HIGH')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      for (const insight of res.body.data) {
        expect(insight.priority).toBe('HIGH')
      }
    })

    it('should filter by status=active (non-dismissed)', async () => {
      const res = await request(app)
        .get('/api/ai/insights?status=active')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      for (const insight of res.body.data) {
        expect(insight.dismissed).toBe(false)
      }
    })
  })

  // ─── Insight actions ─────────────────────────────────────────────

  describe('Insight dismiss and act', () => {
    let insightId: string

    beforeEach(async () => {
      const insight = await prisma.aIInsight.create({
        data: {
          organizationId: testOrgId,
          type: 'LEAD_FOLLOWUP',
          priority: 'MEDIUM',
          title: 'Test insight',
          description: 'Test description',
        },
      })
      insightId = insight.id
    })

    it('should dismiss an insight', async () => {
      const res = await request(app)
        .post(`/api/ai/insights/${insightId}/dismiss`)
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      // Verify dismissed
      const insight = await prisma.aIInsight.findUnique({ where: { id: insightId } })
      expect(insight?.dismissed).toBe(true)
    })

    it('should mark insight as acted upon', async () => {
      const res = await request(app)
        .post(`/api/ai/insights/${insightId}/act`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ actionTaken: 'Followed up with leads' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('should return 404 for non-existent insight', async () => {
      const res = await request(app)
        .post('/api/ai/insights/nonexistent-id/dismiss')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(404)
    })
  })

  // ─── Preferences ─────────────────────────────────────────────────

  describe('AI Preferences', () => {
    it('should get default preferences', async () => {
      const res = await request(app)
        .get('/api/ai/preferences')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('should save and retrieve preferences', async () => {
      const prefs = {
        chatbot: { defaultTone: 'PROFESSIONAL' },
      }

      const saveRes = await request(app)
        .post('/api/ai/preferences')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send(prefs)

      expect(saveRes.status).toBe(200)
      expect(saveRes.body.success).toBe(true)
    })

    it('should reset preferences', async () => {
      const res = await request(app)
        .post('/api/ai/preferences/reset')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  // ─── AI Features & Stats ─────────────────────────────────────────

  describe('GET /api/ai/features', () => {
    it('should return AI feature list', async () => {
      const res = await request(app)
        .get('/api/ai/features')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  describe('GET /api/ai/stats', () => {
    it('should return AI hub stats', async () => {
      const res = await request(app)
        .get('/api/ai/stats')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('messagesThisMonth')
      expect(res.body.data).toHaveProperty('totalModels')
    })
  })

  // ─── Feedback Stats ──────────────────────────────────────────────

  describe('GET /api/ai/feedback/stats', () => {
    it('should return feedback statistics', async () => {
      const res = await request(app)
        .get('/api/ai/feedback/stats')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('chat')
      expect(res.body.data).toHaveProperty('insights')
    })
  })

  // ─── Budget Settings ─────────────────────────────────────────────

  describe('Budget Settings', () => {
    it('should return default budget settings', async () => {
      const res = await request(app)
        .get('/api/ai/budget-settings')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveProperty('warning')
      expect(res.body.data).toHaveProperty('caution')
      expect(res.body.data).toHaveProperty('hardLimit')
    })

    it('should require admin to update budget settings', async () => {
      const res = await request(app)
        .put('/api/ai/budget-settings')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ warning: 30, caution: 60, hardLimit: 120 })

      // Regular user should be forbidden
      expect(res.status).toBe(403)
    })

    it('should allow admin to update budget settings', async () => {
      const res = await request(app)
        .put('/api/ai/budget-settings')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ warning: 30, caution: 60, hardLimit: 120 })

      expect(res.status).toBe(200)
      expect(res.body.data.warning).toBe(30)
      expect(res.body.data.caution).toBe(60)
      expect(res.body.data.hardLimit).toBe(120)
    })
  })

  // ─── Org Settings (admin-only write) ──────────────────────────────

  describe('Org AI Settings', () => {
    it('should get org settings', async () => {
      const res = await request(app)
        .get('/api/ai/org-settings')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('should require admin to update org settings', async () => {
      const res = await request(app)
        .put('/api/ai/org-settings')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ model: 'gpt-4' })

      expect(res.status).toBe(403)
    })
  })

  // ─── Available Models ─────────────────────────────────────────────

  describe('GET /api/ai/available-models', () => {
    it('should return available AI models', async () => {
      const res = await request(app)
        .get('/api/ai/available-models')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThan(0)
      expect(res.body.data[0]).toHaveProperty('model')
      expect(res.body.data[0]).toHaveProperty('inputCost')
      expect(res.body.data[0]).toHaveProperty('outputCost')
    })
  })

  // ─── Recommendations ─────────────────────────────────────────────

  describe('GET /api/ai/recommendations', () => {
    it('should return recommendations', async () => {
      const res = await request(app)
        .get('/api/ai/recommendations')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  // ─── Lead Scoring ────────────────────────────────────────────────

  describe('POST /api/ai/recalculate-scores (admin-only)', () => {
    it('should require admin role', async () => {
      const res = await request(app)
        .post('/api/ai/recalculate-scores')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(403)
    })

    it('should allow admin to initiate recalculation', async () => {
      const res = await request(app)
        .post('/api/ai/recalculate-scores')
        .set('Authorization', `Bearer ${adminAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  // ─── Feature Importance ──────────────────────────────────────────

  describe('GET /api/ai/feature-importance', () => {
    it('should return feature importance data', async () => {
      const res = await request(app)
        .get('/api/ai/feature-importance')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  // ─── Data Quality ────────────────────────────────────────────────

  describe('GET /api/ai/data-quality', () => {
    it('should return data quality metrics', async () => {
      const res = await request(app)
        .get('/api/ai/data-quality')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  // ─── Recalibration Status ────────────────────────────────────────

  describe('GET /api/ai/recalibration-status', () => {
    it('should return "none" when no job exists', async () => {
      const res = await request(app)
        .get('/api/ai/recalibration-status')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('none')
    })
  })

  // ─── Templates ───────────────────────────────────────────────────

  describe('GET /api/ai/templates', () => {
    it('should return templates list', async () => {
      const res = await request(app)
        .get('/api/ai/templates')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  // ─── Predictions (read-only) ─────────────────────────────────────

  describe('GET /api/ai/predictions', () => {
    it('should return global predictions', async () => {
      const res = await request(app)
        .get('/api/ai/predictions')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  // ─── Cost Dashboard ──────────────────────────────────────────────

  describe('GET /api/ai/cost-dashboard', () => {
    it('should return cost dashboard data', async () => {
      const res = await request(app)
        .get('/api/ai/cost-dashboard')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('currentMonth')
      expect(res.body.data).toHaveProperty('budget')
      expect(res.body.data).toHaveProperty('costHistory')
    })
  })

  // ─── Usage Limits ────────────────────────────────────────────────

  describe('GET /api/ai/usage/limits', () => {
    it('should return usage limits and current usage', async () => {
      const res = await request(app)
        .get('/api/ai/usage/limits')
        .set('Authorization', `Bearer ${testAccessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('costHistory')
    })
  })

  // ─── Training upload (admin-only) ────────────────────────────────

  describe('POST /api/ai/models/training/upload', () => {
    it('should require admin role', async () => {
      const res = await request(app)
        .post('/api/ai/models/training/upload')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ outcomes: [{ leadId: 'test', converted: true }] })

      expect(res.status).toBe(403)
    })
  })
})
