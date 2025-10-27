import './setup'  // Import test setup to configure environment
import request from 'supertest'
import express from 'express'
import { prisma } from '../src/config/database'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import activityRoutes from '../src/routes/activity.routes'
import { errorHandler } from '../src/middleware/errorHandler'

const app = express()
app.use(express.json())
app.use('/api/activities', activityRoutes)
app.use(errorHandler)

describe('Activity Management', () => {
  let authToken: string
  let userId: string
  let leadId: string
  let campaignId: string

  beforeEach(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10)
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: 'USER'
      }
    })
    userId = user.id

    // Generate auth token (must match backend JWT format with issuer/audience)
    authToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_ACCESS_SECRET || 'test-access-secret-123',
      { 
        expiresIn: '24h',
        issuer: 'realestate-pro-api',
        audience: 'realestate-pro-client'
      }
    )

    // Create test lead
    const lead = await prisma.lead.create({
      data: {
        name: 'Test Lead',
        email: 'lead@example.com',
        phone: '555-0100',
        status: 'NEW',
        assignedToId: userId
      }
    })
    leadId = lead.id

    // Create test campaign
    const campaign = await prisma.campaign.create({
      data: {
        name: 'Test Campaign',
        type: 'EMAIL',
        status: 'DRAFT',
        createdById: userId
      }
    })
    campaignId = campaign.id
  })

  describe('POST /api/activities', () => {
    it('should create a new activity', async () => {
      const response = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'EMAIL_SENT',
          title: 'Sent welcome email',
          description: 'Initial outreach email sent to lead',
          leadId,
          metadata: { subject: 'Welcome!' }
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.type).toBe('EMAIL_SENT')
      expect(response.body.data.title).toBe('Sent welcome email')
      expect(response.body.data.userId).toBe(userId)
      expect(response.body.data.leadId).toBe(leadId)
      expect(response.body.data.user).toBeDefined()
      expect(response.body.data.lead).toBeDefined()
    })

    it('should create activity with campaign reference', async () => {
      const response = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'CAMPAIGN_LAUNCHED',
          title: 'Campaign launched',
          campaignId
        })

      expect(response.status).toBe(201)
      expect(response.body.data.campaignId).toBe(campaignId)
      expect(response.body.data.campaign).toBeDefined()
    })

    it('should return 404 if lead not found', async () => {
      const response = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'NOTE_ADDED',
          title: 'Added note',
          leadId: 'clx1234567890abcdefghijk' // Valid CUID format but non-existent
        })

      expect(response.status).toBe(404)
    })

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/activities')
        .send({
          type: 'EMAIL_SENT',
          title: 'Test'
        })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/activities', () => {
    beforeEach(async () => {
      // Create sample activities
      await prisma.activity.createMany({
        data: [
          {
            type: 'EMAIL_SENT',
            title: 'Email 1',
            userId,
            leadId
          },
          {
            type: 'SMS_SENT',
            title: 'SMS 1',
            userId,
            leadId
          },
          {
            type: 'CALL_MADE',
            title: 'Call 1',
            userId,
            campaignId
          }
        ]
      })
    })

    it('should get all activities', async () => {
      const response = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.activities).toHaveLength(3)
      expect(response.body.data.pagination).toBeDefined()
      expect(response.body.data.pagination.total).toBe(3)
    })

    it('should filter activities by type', async () => {
      const response = await request(app)
        .get('/api/activities?type=EMAIL_SENT')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.activities).toHaveLength(1)
      expect(response.body.data.activities[0].type).toBe('EMAIL_SENT')
    })

    it('should filter activities by leadId', async () => {
      const response = await request(app)
        .get(`/api/activities?leadId=${leadId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.activities).toHaveLength(2)
      expect(response.body.data.activities.every((a: any) => a.leadId === leadId)).toBe(true)
    })

    it('should filter activities by campaignId', async () => {
      const response = await request(app)
        .get(`/api/activities?campaignId=${campaignId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.activities).toHaveLength(1)
      expect(response.body.data.activities[0].campaignId).toBe(campaignId)
    })

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/activities?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.activities).toHaveLength(2)
      expect(response.body.data.pagination.page).toBe(1)
      expect(response.body.data.pagination.limit).toBe(2)
      expect(response.body.data.pagination.pages).toBe(2)
    })
  })

  describe('GET /api/activities/stats', () => {
    beforeEach(async () => {
      await prisma.activity.createMany({
        data: [
          { type: 'EMAIL_SENT', title: 'Email 1', userId },
          { type: 'EMAIL_SENT', title: 'Email 2', userId },
          { type: 'SMS_SENT', title: 'SMS 1', userId },
          { type: 'CALL_MADE', title: 'Call 1', userId }
        ]
      })
    })

    it('should return activity statistics', async () => {
      const response = await request(app)
        .get('/api/activities/stats')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.total).toBe(4)
      expect(response.body.data.byType).toBeDefined()
      expect(response.body.data.byType.EMAIL_SENT).toBe(2)
      expect(response.body.data.byType.SMS_SENT).toBe(1)
      expect(response.body.data.byType.CALL_MADE).toBe(1)
      expect(response.body.data.recentActivities).toBeDefined()
      expect(response.body.data.recentActivities.length).toBeLessThanOrEqual(10)
    })
  })

  describe('GET /api/activities/:id', () => {
    it('should get single activity by ID', async () => {
      const activity = await prisma.activity.create({
        data: {
          type: 'EMAIL_SENT',
          title: 'Test Email',
          description: 'Test description',
          userId,
          leadId,
          metadata: { test: 'data' }
        }
      })

      const response = await request(app)
        .get(`/api/activities/${activity.id}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(activity.id)
      expect(response.body.data.title).toBe('Test Email')
      expect(response.body.data.user).toBeDefined()
      expect(response.body.data.lead).toBeDefined()
    })

    it('should return 404 for non-existent activity', async () => {
      const response = await request(app)
        .get('/api/activities/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/activities/:id', () => {
    it('should update an activity', async () => {
      const activity = await prisma.activity.create({
        data: {
          type: 'EMAIL_SENT',
          title: 'Original Title',
          userId
        }
      })

      const response = await request(app)
        .put(`/api/activities/${activity.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          description: 'New description'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe('Updated Title')
      expect(response.body.data.description).toBe('New description')
    })

    it('should return 404 for non-existent activity', async () => {
      const response = await request(app)
        .put('/api/activities/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'New Title'
        })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/activities/:id', () => {
    it('should delete an activity', async () => {
      const activity = await prisma.activity.create({
        data: {
          type: 'EMAIL_SENT',
          title: 'To Delete',
          userId
        }
      })

      const response = await request(app)
        .delete(`/api/activities/${activity.id}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)

      // Verify deletion
      const deleted = await prisma.activity.findUnique({
        where: { id: activity.id }
      })
      expect(deleted).toBeNull()
    })

    it('should return 404 for non-existent activity', async () => {
      const response = await request(app)
        .delete('/api/activities/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/activities/lead/:leadId', () => {
    it('should get all activities for a specific lead', async () => {
      // Create another lead
      const lead2 = await prisma.lead.create({
        data: {
          name: 'Lead 2',
          email: 'lead2@example.com',
          status: 'NEW',
          assignedToId: userId
        }
      })

      // Create activities for both leads
      await prisma.activity.createMany({
        data: [
          { type: 'EMAIL_SENT', title: 'Email to lead 1', userId, leadId },
          { type: 'CALL_MADE', title: 'Call to lead 1', userId, leadId },
          { type: 'EMAIL_SENT', title: 'Email to lead 2', userId, leadId: lead2.id }
        ]
      })

      const response = await request(app)
        .get(`/api/activities/lead/${leadId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.activities).toHaveLength(2)
      expect(response.body.data.activities.every((a: any) => a.leadId === leadId)).toBe(true)
    })

    it('should return 404 if lead not found', async () => {
      const response = await request(app)
        .get('/api/activities/lead/invalid-lead-id')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/activities/campaign/:campaignId', () => {
    it('should get all activities for a specific campaign', async () => {
      // Create another campaign
      const campaign2 = await prisma.campaign.create({
        data: {
          name: 'Campaign 2',
          type: 'SMS',
          status: 'DRAFT',
          createdById: userId
        }
      })

      // Create activities for both campaigns
      await prisma.activity.createMany({
        data: [
          { type: 'CAMPAIGN_LAUNCHED', title: 'Launched campaign 1', userId, campaignId },
          { type: 'EMAIL_SENT', title: 'Email from campaign 1', userId, campaignId },
          { type: 'CAMPAIGN_LAUNCHED', title: 'Launched campaign 2', userId, campaignId: campaign2.id }
        ]
      })

      const response = await request(app)
        .get(`/api/activities/campaign/${campaignId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.activities).toHaveLength(2)
      expect(response.body.data.activities.every((a: any) => a.campaignId === campaignId)).toBe(true)
    })

    it('should return 404 if campaign not found', async () => {
      const response = await request(app)
        .get('/api/activities/campaign/invalid-campaign-id')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
    })
  })
})
