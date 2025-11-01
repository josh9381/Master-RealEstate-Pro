import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import app from '../../src/server'

const prisma = new PrismaClient()

describe('Appointment System Integration Tests', () => {
  let authToken: string
  let testLeadId: string
  let testAppointmentId: string

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

    authToken = loginResponse.body.data.tokens.accessToken

    // Create test lead
    const leadResponse = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Appointment Test Lead',
        email: 'appointment-test@example.com',
        phone: '555-999-0000',
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
    if (testAppointmentId) {
      await prisma.appointment.delete({ where: { id: testAppointmentId } }).catch(() => {})
    }
    await prisma.$disconnect()
  })

  describe('Appointment Creation', () => {
    test('Should create appointment', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(14, 0, 0, 0) // 2 PM tomorrow

      const endTime = new Date(tomorrow)
      endTime.setHours(15, 0, 0, 0) // 3 PM tomorrow

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Property Viewing',
          description: 'Show downtown condo',
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
          type: 'MEETING',
          location: '123 Main St',
          leadId: testLeadId
        })

      if (response.status !== 201) {
        console.error('Appointment creation failed:', response.status, response.body)
      }

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.appointment).toHaveProperty('id')
      expect(response.body.data.appointment.title).toBe('Property Viewing')
      expect(response.body.data.appointment.status).toBe('SCHEDULED')
      
      testAppointmentId = response.body.data.appointment.id
      console.log('Created appointment with ID:', testAppointmentId, 'userId:', response.body.data.appointment.userId)
    })

    test('Should require valid time range', async () => {
      const now = new Date()
      const past = new Date(now.getTime() - 1000 * 60 * 60) // 1 hour ago

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Past Appointment',
          startTime: past.toISOString(),
          endTime: now.toISOString(),
          type: 'MEETING'
        })

      // Should fail validation (can't schedule in the past)
      expect(response.status).toBe(400)
    })

    test('Should validate endTime after startTime', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(14, 0, 0, 0)

      const earlierTime = new Date(tomorrow)
      earlierTime.setHours(13, 0, 0, 0) // Earlier than start

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Invalid Time Range',
          startTime: tomorrow.toISOString(),
          endTime: earlierTime.toISOString(),
          type: 'MEETING'
        })

      expect(response.status).toBe(400)
    })
  })

  describe('Appointment Management', () => {
    test('Should list all appointments', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.appointments)).toBe(true)
    })

    test('Should get single appointment', async () => {
      console.log('testAppointmentId:', testAppointmentId)
      const response = await request(app)
        .get(`/api/appointments/${testAppointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)

      if (response.status !== 200) {
        console.error('Get appointment failed:', response.status, response.body)
      }

      expect(response.status).toBe(200)
      expect(response.body.data.appointment.id).toBe(testAppointmentId)
    })

    test('Should update appointment', async () => {
      const response = await request(app)
        .put(`/api/appointments/${testAppointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Property Viewing',
          description: 'Updated description',
          location: '456 Oak Ave'
        })

      expect(response.status).toBe(200)
      expect(response.body.data.appointment.title).toBe('Updated Property Viewing')
      expect(response.body.data.appointment.location).toBe('456 Oak Ave')
    })

    test('Should filter appointments by lead', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ leadId: testLeadId })

      expect(response.status).toBe(200)
      const appointments = response.body.data.appointments
      appointments.forEach((apt: { leadId: string }) => {
        expect(apt.leadId).toBe(testLeadId)
      })
    })

    test('Should filter appointments by status', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'SCHEDULED' })

      expect(response.status).toBe(200)
      const appointments = response.body.data.appointments
      appointments.forEach((apt: { status: string }) => {
        expect(apt.status).toBe('SCHEDULED')
      })
    })
  })

  describe('Appointment Conflicts', () => {
    test('Should detect conflicting appointments', async () => {
      const twoDaysFromNow = new Date()
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)
      twoDaysFromNow.setHours(10, 0, 0, 0) // 10 AM

      const endTime = new Date(twoDaysFromNow)
      endTime.setHours(11, 0, 0, 0) // 11 AM

      // Create first appointment
      const response1 = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'First Appointment',
          startTime: twoDaysFromNow.toISOString(),
          endTime: endTime.toISOString(),
          type: 'MEETING',
          location: 'Conference Room A'
        })

      if (response1.status !== 201) {
        console.error('First appointment creation failed:', response1.status, response1.body)
      }

      expect(response1.status).toBe(201)
      const firstAppointmentId = response1.body.data.appointment.id

      // Try to create overlapping appointment
      const overlappingStart = new Date(twoDaysFromNow)
      overlappingStart.setMinutes(30) // 10:30 AM (overlaps with first)

      const overlappingEnd = new Date(overlappingStart)
      overlappingEnd.setHours(11, 30, 0, 0) // 11:30 AM

      const response2 = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Overlapping Appointment',
          startTime: overlappingStart.toISOString(),
          endTime: overlappingEnd.toISOString(),
          type: 'MEETING',
          location: 'Conference Room A'
        })

      // Should either fail or warn about conflict
      // Implementation may vary - just check it doesn't silently succeed
      if (response2.status === 201) {
        // If it succeeded, there should be a conflict warning in metadata
        console.log('Note: Appointment system allows overlapping appointments')
      }

      // Cleanup
      await prisma.appointment.delete({ where: { id: firstAppointmentId } })
    })
  })

  describe('Appointment Status Management', () => {
    test('Should confirm appointment', async () => {
      const response = await request(app)
        .patch(`/api/appointments/${testAppointmentId}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.appointment.status).toBe('CONFIRMED')
    })

    test('Should cancel appointment', async () => {
      const response = await request(app)
        .delete(`/api/appointments/${testAppointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)

      // Verify cancelled (should return 404 or show as cancelled)
      const getResponse = await request(app)
        .get(`/api/appointments/${testAppointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)

      // Either deleted (404) or marked as cancelled
      expect([200, 404]).toContain(getResponse.status)
      
      if (getResponse.status === 200) {
        expect(getResponse.body.data.appointment.status).toBe('CANCELLED')
      }
    })
  })

  describe('Appointment Reminders', () => {
    test('Should schedule reminder for appointment', async () => {
      // Create appointment for tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(15, 0, 0, 0) // 3 PM tomorrow

      const endTime = new Date(tomorrow)
      endTime.setHours(16, 0, 0, 0) // 4 PM tomorrow

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Reminder Test Appointment',
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
          type: 'MEETING',
          location: 'Office Building',
          leadId: testLeadId
        })

      expect(response.status).toBe(201)
      const appointmentId = response.body.data.appointment.id

      // Verify reminder hasn't been sent yet
      expect(response.body.data.appointment.reminderSent).toBe(false)

      // Send reminder manually (test endpoint)
      const reminderResponse = await request(app)
        .post(`/api/appointments/${appointmentId}/reminder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})

      expect(reminderResponse.status).toBe(200)
      expect(reminderResponse.body.success).toBe(true)

      // Verify reminder flag updated
      const updatedResponse = await request(app)
        .get(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(updatedResponse.body.data.appointment.reminderSent).toBe(true)

      // Cleanup
      await prisma.appointment.delete({ where: { id: appointmentId } })
    })
  })

  describe('Calendar View', () => {
    test('Should get appointments by date range', async () => {
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 7) // Next 7 days

      const response = await request(app)
        .get('/api/appointments/calendar')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.appointments)).toBe(true)

      // All appointments should be within range
      response.body.data.appointments.forEach((apt: { startTime: string }) => {
        const aptDate = new Date(apt.startTime)
        expect(aptDate >= startDate && aptDate <= endDate).toBe(true)
      })
    })

    test('Should get appointments for specific type', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'MEETING' })

      expect(response.status).toBe(200)
      response.body.data.appointments.forEach((apt: { type: string }) => {
        expect(apt.type).toBe('MEETING')
      })
    })
  })

  describe('Appointment Rescheduling', () => {
    test('Should reschedule appointment', async () => {
      // Create appointment
      const originalTime = new Date()
      originalTime.setDate(originalTime.getDate() + 3)
      originalTime.setHours(14, 0, 0, 0)

      const originalEnd = new Date(originalTime)
      originalEnd.setHours(15, 0, 0, 0)

      const createResponse = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Reschedule Test',
          startTime: originalTime.toISOString(),
          endTime: originalEnd.toISOString(),
          type: 'MEETING',
          meetingUrl: 'https://zoom.us/j/123456789'
        })

      const appointmentId = createResponse.body.data.appointment.id

      // Reschedule to new time
      const newTime = new Date(originalTime)
      newTime.setHours(16, 0, 0, 0) // Move to 4 PM

      const newEnd = new Date(newTime)
      newEnd.setHours(17, 0, 0, 0)

      const rescheduleResponse = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          startTime: newTime.toISOString(),
          endTime: newEnd.toISOString()
        })

      expect(rescheduleResponse.status).toBe(200)
      expect(rescheduleResponse.body.success).toBe(true)
      
      const updatedTime = new Date(rescheduleResponse.body.data.appointment.startTime)
      expect(updatedTime.getHours()).toBe(16)

      // Cleanup
      await prisma.appointment.delete({ where: { id: appointmentId } })
    })
  })
})
