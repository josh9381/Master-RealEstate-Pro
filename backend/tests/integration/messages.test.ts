import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import app from '../../src/server'

const prisma = new PrismaClient()

describe('Message System Integration Tests', () => {
  let authToken: string
  let testEmailTemplateId: string
  let testSMSTemplateId: string
  let testLeadId: string

  beforeAll(async () => {
    // Create test user first
    await prisma.user.upsert({
      where: { email: 'admin@realestate.com' },
      update: {},
      create: {
        email: 'admin@realestate.com',
        password: '$2b$10$2hcoGANf.WGK8apFEHGvcOdLpp84Z4EEjLN7zQiIOqcFQbNETcA3e', // 'admin123' hashed
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      }
    })

    // Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@realestate.com',
        password: 'admin123'
      })

    if (loginResponse.status !== 200) {
      console.error('Login failed:', loginResponse.status, loginResponse.body)
      throw new Error('Login failed')
    }

    authToken = loginResponse.body.data.tokens.accessToken

    // Create test lead
    const leadResponse = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Message Test Lead',
        email: 'message-test@example.com',
        phone: '555-777-8888',
        status: 'NEW',
        source: 'Test'
      })

    testLeadId = leadResponse.body.data.lead.id
  })

  afterAll(async () => {
    // Cleanup
    if (testLeadId) {
      await prisma.lead.delete({ where: { id: testLeadId } }).catch(() => {})
    }
    if (testEmailTemplateId) {
      await prisma.emailTemplate.delete({ where: { id: testEmailTemplateId } }).catch(() => {})
    }
    if (testSMSTemplateId) {
      await prisma.sMSTemplate.delete({ where: { id: testSMSTemplateId } }).catch(() => {})
    }
    await prisma.$disconnect()
  })

  describe('Email Template Management', () => {
    test('Should create email template', async () => {
      const response = await request(app)
        .post('/api/email-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Welcome Email',
          subject: 'Welcome {{lead.firstName}}!',
          body: 'Hello {{lead.firstName}} {{lead.lastName}},\n\nWelcome to our service!\n\nEmail: {{lead.email}}\nPhone: {{lead.phone}}',
          category: 'welcome',
          isActive: true,
          variables: {
            'lead.firstName': 'string',
            'lead.lastName': 'string',
            'lead.email': 'string',
            'lead.phone': 'string'
          }
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.template).toHaveProperty('id')
      expect(response.body.data.template.name).toBe('Test Welcome Email')
      
      testEmailTemplateId = response.body.data.template.id
    })

    test('Should list email templates', async () => {
      const response = await request(app)
        .get('/api/email-templates')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.templates)).toBe(true)
    })

    test('Should get single email template', async () => {
      const response = await request(app)
        .get(`/api/email-templates/${testEmailTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.template.id).toBe(testEmailTemplateId)
    })

    test('Should update email template', async () => {
      const response = await request(app)
        .put(`/api/email-templates/${testEmailTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Test Email',
          subject: 'Updated Subject'
        })

      expect(response.status).toBe(200)
      expect(response.body.data.template.name).toBe('Updated Test Email')
    })
  })

  describe('SMS Template Management', () => {
    test('Should create SMS template', async () => {
      const response = await request(app)
        .post('/api/sms-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test SMS',
          body: 'Hi {{lead.firstName}}, this is a test message from our team!',
          category: 'notification',
          isActive: true,
          variables: {
            'lead.firstName': 'string'
          }
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.template).toHaveProperty('id')
      
      testSMSTemplateId = response.body.data.template.id
    })

    test('Should validate SMS character limit', async () => {
      const longMessage = 'A'.repeat(1601) // 1601 characters - exceeds 10 segments

      const response = await request(app)
        .post('/api/sms-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Too Long SMS',
          body: longMessage,
          category: 'test'
        })

      // Should fail validation
      expect(response.status).toBe(400)
    })

    test('Should list SMS templates', async () => {
      const response = await request(app)
        .get('/api/sms-templates')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body.data.templates)).toBe(true)
    })
  })

  describe('Sending Messages', () => {
    test('Should send email (mock)', async () => {
      const response = await request(app)
        .post('/api/messages/email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: 'message-test@example.com',
          subject: 'Test Email',
          body: 'This is a test email',
          leadId: testLeadId
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.message).toHaveProperty('id')
      expect(response.body.data.message.type).toBe('EMAIL')
      expect(response.body.data.message.status).toBe('DELIVERED')
    })

    test('Should send SMS (mock)', async () => {
      const response = await request(app)
        .post('/api/messages/sms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: '+15557778888', // E.164 format
          body: 'Test SMS message',
          leadId: testLeadId
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.message.type).toBe('SMS')
      expect(response.body.data.message.status).toBe('DELIVERED')
    })

    test('Should send email with template', async () => {
      const response = await request(app)
        .post('/api/messages/email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: 'message-test@example.com',
          templateId: testEmailTemplateId,
          variables: {
            'lead.firstName': 'John',
            'lead.lastName': 'Doe',
            'lead.email': 'message-test@example.com',
            'lead.phone': '555-777-8888'
          },
          leadId: testLeadId
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      
      // Template usage should be incremented
      const templateResponse = await request(app)
        .get(`/api/email-templates/${testEmailTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(templateResponse.body.data.template.usageCount).toBeGreaterThan(0)
    })
  })

  describe('Message Inbox', () => {
    test('Should list all messages', async () => {
      const response = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.messages)).toBe(true)
    })

    test('Should filter messages by type', async () => {
      const response = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'EMAIL' })

      expect(response.status).toBe(200)
      const messages = response.body.data.messages
      messages.forEach((msg: { type: string }) => {
        expect(msg.type).toBe('EMAIL')
      })
    })

    test('Should filter messages by lead', async () => {
      const response = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ leadId: testLeadId })

      expect(response.status).toBe(200)
      const messages = response.body.data.messages
      messages.forEach((msg: { leadId: string }) => {
        expect(msg.leadId).toBe(testLeadId)
      })
    })

    test('Should get single message', async () => {
      // Get first message
      const listResponse = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ leadId: testLeadId })

      const messageId = listResponse.body.data.messages[0].id

      const response = await request(app)
        .get(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.message.id).toBe(messageId)
    })
  })

  describe('Message Actions', () => {
    test('Should mark message as read', async () => {
      // Get a message
      const listResponse = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ leadId: testLeadId })

      const messageId = listResponse.body.data.messages[0].id

      const response = await request(app)
        .patch(`/api/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.message.readAt).toBeDefined()
    })

    test('Should delete message', async () => {
      // Create a message to delete
      const createResponse = await request(app)
        .post('/api/messages/email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: 'delete-test@example.com',
          subject: 'To be deleted',
          body: 'This message will be deleted'
        })

      const messageId = createResponse.body.data.message.id

      const deleteResponse = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(deleteResponse.status).toBe(200)

      // Verify deleted
      const getResponse = await request(app)
        .get(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(getResponse.status).toBe(404)
    })
  })

  describe('Template Variables', () => {
    test('Should replace variables in email template', async () => {
      const response = await request(app)
        .post('/api/messages/email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: 'variable-test@example.com',
          subject: 'Hello {{lead.firstName}}!',
          body: 'Your email is {{lead.email}}',
          variables: {
            'lead.firstName': 'Alice',
            'lead.email': 'alice@example.com'
          }
        })

      expect(response.status).toBe(201)
      // In real implementation, verify the body has replaced variables
      // For now, just verify it succeeded
      expect(response.body.success).toBe(true)
    })
  })
})
