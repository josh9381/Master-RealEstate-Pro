import '../tests/setup'
import request from 'supertest'
import express from 'express'
import { prisma } from '../src/config/database'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import analyticsRoutes from '../src/routes/analytics.routes'
import { errorHandler } from '../src/middleware/errorHandler'

const app = express()
app.use(express.json())
app.use('/api/analytics', analyticsRoutes)
app.use(errorHandler)

describe('Analytics Endpoints', () => {
  let authToken: string
  let userId: string

  beforeEach(async () => {
    // Clear test data
    await prisma.activity.deleteMany()
    await prisma.note.deleteMany()
    await prisma.task.deleteMany()
    await prisma.campaign.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10)
    const user = await prisma.user.create({
      data: {
        email: 'analytics@example.com',
        password: hashedPassword,
        firstName: 'Analytics',
        lastName: 'User',
        role: 'USER'
      }
    })
    userId = user.id

    // Generate auth token
    authToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_ACCESS_SECRET || 'test-access-secret-123',
      { expiresIn: '24h' }
    )

    // Create sample data for analytics
    await createSampleData(userId)
  })

  describe('GET /api/analytics/dashboard', () => {
    it('should return dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.overview).toBeDefined()
      expect(response.body.data.leads).toBeDefined()
      expect(response.body.data.campaigns).toBeDefined()
      expect(response.body.data.tasks).toBeDefined()
      expect(response.body.data.activities).toBeDefined()
      
      // Check overview stats
      expect(response.body.data.overview.totalLeads).toBeGreaterThan(0)
      expect(response.body.data.overview.totalCampaigns).toBeGreaterThan(0)
      expect(response.body.data.overview.totalTasks).toBeGreaterThan(0)
    })

    it('should filter by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const endDate = new Date().toISOString()

      const response = await request(app)
        .get(`/api/analytics/dashboard?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
    })

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/analytics/leads', () => {
    it('should return lead analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/leads')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.total).toBeGreaterThan(0)
      expect(response.body.data.byStatus).toBeDefined()
      expect(response.body.data.bySource).toBeDefined()
      expect(response.body.data.conversionRate).toBeDefined()
      expect(response.body.data.averageScore).toBeDefined()
      expect(response.body.data.topLeads).toBeInstanceOf(Array)
    })

    it('should group leads by status', async () => {
      const response = await request(app)
        .get('/api/analytics/leads')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.byStatus).toBeDefined()
      expect(typeof response.body.data.byStatus).toBe('object')
    })

    it('should return top leads', async () => {
      const response = await request(app)
        .get('/api/analytics/leads')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.topLeads).toBeDefined()
      expect(response.body.data.topLeads.length).toBeLessThanOrEqual(10)
      
      if (response.body.data.topLeads.length > 1) {
        // Verify sorted by score descending
        expect(response.body.data.topLeads[0].score).toBeGreaterThanOrEqual(
          response.body.data.topLeads[1].score
        )
      }
    })
  })

  describe('GET /api/analytics/campaigns', () => {
    it('should return campaign analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/campaigns')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.total).toBeGreaterThan(0)
      expect(response.body.data.byType).toBeDefined()
      expect(response.body.data.byStatus).toBeDefined()
      expect(response.body.data.performance).toBeDefined()
      expect(response.body.data.topCampaigns).toBeInstanceOf(Array)
    })

    it('should return campaign performance metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/campaigns')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      const perf = response.body.data.performance
      
      expect(perf.totalSent).toBeDefined()
      expect(perf.totalDelivered).toBeDefined()
      expect(perf.totalOpened).toBeDefined()
      expect(perf.totalClicked).toBeDefined()
      expect(perf.deliveryRate).toBeDefined()
      expect(perf.openRate).toBeDefined()
      expect(perf.clickRate).toBeDefined()
      expect(perf.conversionRate).toBeDefined()
    })

    it('should return top campaigns', async () => {
      const response = await request(app)
        .get('/api/analytics/campaigns')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.topCampaigns).toBeDefined()
      expect(response.body.data.topCampaigns.length).toBeLessThanOrEqual(10)
    })
  })

  describe('GET /api/analytics/tasks', () => {
    it('should return task analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/tasks')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.total).toBeGreaterThan(0)
      expect(response.body.data.byStatus).toBeDefined()
      expect(response.body.data.byPriority).toBeDefined()
      expect(response.body.data.completedToday).toBeDefined()
      expect(response.body.data.dueToday).toBeDefined()
      expect(response.body.data.overdue).toBeDefined()
      expect(response.body.data.completionRate).toBeDefined()
    })

    it('should calculate completion rate', async () => {
      const response = await request(app)
        .get('/api/analytics/tasks')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.completionRate).toBeGreaterThanOrEqual(0)
      expect(response.body.data.completionRate).toBeLessThanOrEqual(100)
    })

    it('should track overdue tasks', async () => {
      const response = await request(app)
        .get('/api/analytics/tasks')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.overdue).toBeGreaterThanOrEqual(0)
    })
  })

  describe('GET /api/analytics/activity-feed', () => {
    it('should return activity feed', async () => {
      const response = await request(app)
        .get('/api/analytics/activity-feed')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.activities).toBeInstanceOf(Array)
      expect(response.body.data.pagination).toBeDefined()
    })

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/analytics/activity-feed?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.activities.length).toBeLessThanOrEqual(5)
      expect(response.body.data.pagination.page).toBe(1)
      expect(response.body.data.pagination.limit).toBe(5)
    })

    it('should order activities by date descending', async () => {
      const response = await request(app)
        .get('/api/analytics/activity-feed')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      const activities = response.body.data.activities
      
      if (activities.length > 1) {
        const first = new Date(activities[0].createdAt)
        const second = new Date(activities[1].createdAt)
        expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime())
      }
    })
  })
})

// Helper function to create sample data
async function createSampleData(userId: string) {
  // Create leads with different statuses
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        name: 'Lead 1',
        email: 'lead1@example.com',
        status: 'NEW',
        score: 75,
        source: 'website',
        value: 5000,
        assignedToId: userId
      }
    }),
    prisma.lead.create({
      data: {
        name: 'Lead 2',
        email: 'lead2@example.com',
        status: 'CONTACTED',
        score: 85,
        source: 'referral',
        value: 10000,
        assignedToId: userId
      }
    }),
    prisma.lead.create({
      data: {
        name: 'Lead 3',
        email: 'lead3@example.com',
        status: 'WON',
        score: 95,
        source: 'social',
        value: 15000,
        assignedToId: userId
      }
    })
  ])

  // Create campaigns
  await Promise.all([
    prisma.campaign.create({
      data: {
        name: 'Email Campaign 1',
        type: 'EMAIL',
        status: 'ACTIVE',
        sent: 1000,
        delivered: 980,
        opened: 500,
        clicked: 100,
        converted: 20,
        revenue: 50000,
        spent: 5000,
        createdById: userId
      }
    }),
    prisma.campaign.create({
      data: {
        name: 'SMS Campaign 1',
        type: 'SMS',
        status: 'COMPLETED',
        sent: 500,
        delivered: 495,
        opened: 400,
        clicked: 80,
        converted: 10,
        revenue: 25000,
        spent: 2000,
        createdById: userId
      }
    })
  ])

  // Create tasks
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const today = new Date()

  await Promise.all([
    prisma.task.create({
      data: {
        title: 'Completed Task',
        dueDate: yesterday,
        status: 'COMPLETED',
        priority: 'HIGH',
        assignedToId: userId,
        completedAt: new Date()
      }
    }),
    prisma.task.create({
      data: {
        title: 'Overdue Task',
        dueDate: yesterday,
        status: 'PENDING',
        priority: 'URGENT',
        assignedToId: userId
      }
    }),
    prisma.task.create({
      data: {
        title: 'Task Due Today',
        dueDate: today,
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        assignedToId: userId
      }
    }),
    prisma.task.create({
      data: {
        title: 'Future Task',
        dueDate: tomorrow,
        status: 'PENDING',
        priority: 'LOW',
        assignedToId: userId
      }
    })
  ])

  // Create activities
  await Promise.all([
    prisma.activity.create({
      data: {
        type: 'EMAIL_SENT',
        title: 'Welcome email sent',
        userId,
        leadId: leads[0].id
      }
    }),
    prisma.activity.create({
      data: {
        type: 'CALL_MADE',
        title: 'Follow-up call',
        userId,
        leadId: leads[1].id
      }
    }),
    prisma.activity.create({
      data: {
        type: 'LEAD_CREATED',
        title: 'New lead added',
        userId,
        leadId: leads[2].id
      }
    })
  ])
}
