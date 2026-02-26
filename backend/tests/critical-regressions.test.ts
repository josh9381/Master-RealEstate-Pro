/**
 * Critical Regression Tests (T1/T2)
 *
 * These tests cover the highest-risk fixes from Sprints 1–2:
 *   - markAllAsRead org-scoping (L1/L2) — ensures only current user's org messages are affected
 *   - CSV import (L3/L4/L5) — proper parsing, email validation, org-scoping
 *   - makeCall DB persistence (#9) — call records are saved, not lost
 *   - customFields round-trip (#8) — customFields persist through create and update
 *   - Cross-tenant isolation for messages — Org A cannot read/modify Org B messages
 */
import request from 'supertest'
import express from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/config/database'
import leadRoutes from '../src/routes/lead.routes'
import messageRoutes from '../src/routes/message.routes'
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler'
import { generateAccessToken } from '../src/utils/jwt'

// Build a minimal Express app with just the routes we need
const app = express()
app.use(express.json())
app.use('/api/leads', leadRoutes)
app.use('/api/messages', messageRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

// ---- Helpers ----

async function createOrg(name: string, slug: string) {
  return prisma.organization.create({
    data: { name, slug },
  })
}

async function createUser(orgId: string, email: string, role: 'ADMIN' | 'USER' = 'USER') {
  const hashed = await bcrypt.hash('Password123!', 10)
  return prisma.user.create({
    data: {
      firstName: email.split('@')[0],
      lastName: 'Test',
      email,
      password: hashed,
      role,
      organizationId: orgId,
    },
  })
}

function token(userId: string, email: string, role: string, orgId: string) {
  return generateAccessToken(userId, email, role, orgId)
}

// ---- Test Data ----

let orgA: { id: string }
let orgB: { id: string }
let userA: { id: string; email: string; role: string }
let userB: { id: string; email: string; role: string }
let tokenA: string
let tokenB: string
let leadA: { id: string }
let leadB: { id: string }

// ---- Setup / Teardown ----

beforeAll(async () => {
  const ts = Date.now()

  // Create two separate organizations
  orgA = await createOrg(`OrgA-${ts}`, `orga-${ts}`)
  orgB = await createOrg(`OrgB-${ts}`, `orgb-${ts}`)

  // Create one user per org
  userA = await createUser(orgA.id, `usera-${ts}@test.com`, 'ADMIN')
  userB = await createUser(orgB.id, `userb-${ts}@test.com`, 'ADMIN')

  tokenA = token(userA.id, userA.email, userA.role, orgA.id)
  tokenB = token(userB.id, userB.email, userB.role, orgB.id)

  // Create one lead per org
  const leadARes = await request(app)
    .post('/api/leads')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ firstName: 'Alice', lastName: 'A', email: `alice-${ts}@test.com` })
  leadA = leadARes.body.data.lead

  const leadBRes = await request(app)
    .post('/api/leads')
    .set('Authorization', `Bearer ${tokenB}`)
    .send({ firstName: 'Bob', lastName: 'B', email: `bob-${ts}@test.com` })
  leadB = leadBRes.body.data.lead
})

afterAll(async () => {
  // Clean up in correct dependency order
  const orgIds = [orgA?.id, orgB?.id].filter(Boolean)
  if (orgIds.length) {
    await prisma.message.deleteMany({ where: { organizationId: { in: orgIds } } })
    await prisma.activity.deleteMany({ where: { organizationId: { in: orgIds } } })
    await prisma.note.deleteMany({ where: { lead: { organizationId: { in: orgIds } } } })
    await prisma.lead.deleteMany({ where: { organizationId: { in: orgIds } } })
    await prisma.user.deleteMany({ where: { organizationId: { in: orgIds } } })
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } })
  }
  await prisma.$disconnect()
})

// ============================================================================
// markAllAsRead — L1/L2 regression
// ============================================================================

describe('markAllAsRead org-scoping (L1/L2)', () => {
  let msgA: { id: string }
  let msgB: { id: string }

  beforeAll(async () => {
    // Ensure lead A is assigned to userA (markAllAsRead filters on lead.assignedToId)
    await prisma.lead.update({
      where: { id: leadA.id },
      data: { assignedToId: userA.id },
    })
    await prisma.lead.update({
      where: { id: leadB.id },
      data: { assignedToId: userB.id },
    })

    // Create an unread INBOUND message for Org A's lead (assigned to userA)
    msgA = await prisma.message.create({
      data: {
        type: 'EMAIL',
        direction: 'INBOUND',
        body: 'Org A inbound',
        fromAddress: 'someone@ext.com',
        toAddress: userA.email,
        status: 'DELIVERED',
        organizationId: orgA.id,
        leadId: leadA.id,
      },
    })

    // Create an unread INBOUND message for Org B's lead (assigned to userB)
    msgB = await prisma.message.create({
      data: {
        type: 'EMAIL',
        direction: 'INBOUND',
        body: 'Org B inbound',
        fromAddress: 'someone@ext.com',
        toAddress: userB.email,
        status: 'DELIVERED',
        organizationId: orgB.id,
        leadId: leadB.id,
      },
    })
  })

  it('should only mark messages in the requesting user\'s org as read', async () => {
    // User A calls markAllAsRead
    const res = await request(app)
      .post('/api/messages/mark-all-read')
      .set('Authorization', `Bearer ${tokenA}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    // Org A message should now be read
    const afterA = await prisma.message.findUnique({ where: { id: msgA.id } })
    expect(afterA?.readAt).not.toBeNull()

    // Org B message must still be unread
    const afterB = await prisma.message.findUnique({ where: { id: msgB.id } })
    expect(afterB?.readAt).toBeNull()
  })
})

// ============================================================================
// makeCall — DB persistence (#9 / L14)
// ============================================================================

describe('makeCall DB persistence (#9)', () => {
  it('should create a CALL message record in the database', async () => {
    const res = await request(app)
      .post('/api/messages/call')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ to: '+15551234567', leadId: leadA.id })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.message).toHaveProperty('id')
    expect(res.body.data.message.type).toBe('CALL')

    // Verify record exists in DB
    const dbRecord = await prisma.message.findUnique({
      where: { id: res.body.data.message.id },
    })
    expect(dbRecord).not.toBeNull()
    expect(dbRecord?.type).toBe('CALL')
    expect(dbRecord?.direction).toBe('OUTBOUND')
    expect(dbRecord?.organizationId).toBe(orgA.id)
    expect(dbRecord?.toAddress).toBe('+15551234567')
  })

  it('should scope call records to the requesting org', async () => {
    const res = await request(app)
      .post('/api/messages/call')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ to: '+15559999999' })

    expect(res.status).toBe(201)

    const dbRecord = await prisma.message.findUnique({
      where: { id: res.body.data.message.id },
    })
    expect(dbRecord?.organizationId).toBe(orgB.id)
  })
})

// ============================================================================
// CSV Import — L3/L4/L5
// ============================================================================

describe('CSV import (L3/L4/L5)', () => {
  it('should import leads from a well-formed CSV', async () => {
    const csv = 'First Name,Last Name,Email,Phone\nJane,Doe,jane-csv@test.com,555-1111\nJim,Smith,jim-csv@test.com,555-2222'

    const res = await request(app)
      .post('/api/leads/import')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from(csv), { filename: 'leads.csv', contentType: 'text/csv' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.imported).toBe(2)
    expect(res.body.data.skipped).toBe(0)

    // Verify leads exist in the correct org
    const imported = await prisma.lead.findMany({
      where: { organizationId: orgA.id, email: { in: ['jane-csv@test.com', 'jim-csv@test.com'] } },
    })
    expect(imported).toHaveLength(2)
  })

  it('should handle quoted fields with commas (L4 — csv-parse)', async () => {
    const csv = 'First Name,Last Name,Email\n"Smith, Jr.",John,john-quoted@test.com'

    const res = await request(app)
      .post('/api/leads/import')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from(csv), { filename: 'leads.csv', contentType: 'text/csv' })

    expect(res.status).toBe(200)
    expect(res.body.data.imported).toBe(1)

    // Verify the comma was not treated as a delimiter
    const lead = await prisma.lead.findFirst({
      where: { email: 'john-quoted@test.com', organizationId: orgA.id },
    })
    expect(lead).not.toBeNull()
    // csv-parse with columns: header maps "first name" → firstName lookup, 
    // so we check the name wasn't split incorrectly
    expect(lead?.lastName).toBe('John')
  })

  it('should reject rows with invalid email format (L5)', async () => {
    const csv = 'First Name,Last Name,Email\nBad,Email,not-an-email\nGood,Email,good@test.com'

    const res = await request(app)
      .post('/api/leads/import')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from(csv), { filename: 'leads.csv', contentType: 'text/csv' })

    expect(res.status).toBe(200)
    expect(res.body.data.imported).toBe(1)
    expect(res.body.data.skipped).toBe(1)
    expect(res.body.data.errors[0]).toContain('Invalid email')
  })

  it('should scope imported leads to the requesting user\'s org (L3)', async () => {
    const csv = 'First Name,Last Name,Email\nOrgB,Lead,orgb-csv@test.com'

    const res = await request(app)
      .post('/api/leads/import')
      .set('Authorization', `Bearer ${tokenB}`)
      .attach('file', Buffer.from(csv), { filename: 'leads.csv', contentType: 'text/csv' })

    expect(res.status).toBe(200)

    // Lead should be in Org B, not Org A
    const inOrgB = await prisma.lead.findFirst({
      where: { email: 'orgb-csv@test.com', organizationId: orgB.id },
    })
    expect(inOrgB).not.toBeNull()

    const inOrgA = await prisma.lead.findFirst({
      where: { email: 'orgb-csv@test.com', organizationId: orgA.id },
    })
    expect(inOrgA).toBeNull()
  })

  it('should return 400 for empty CSV files', async () => {
    const csv = 'First Name,Last Name,Email\n'

    const res = await request(app)
      .post('/api/leads/import')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from(csv), { filename: 'leads.csv', contentType: 'text/csv' })

    expect(res.status).toBe(400)
  })
})

// ============================================================================
// customFields round-trip (#8)
// ============================================================================

describe('customFields persistence (#8)', () => {
  it('should persist customFields on lead creation', async () => {
    const ts = Date.now()
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        firstName: 'Custom',
        lastName: 'Fields',
        email: `custom-${ts}@test.com`,
        customFields: {
          industry: 'Real Estate',
          budget: 500000,
          website: 'https://example.com',
          address: { street: '123 Main St', city: 'Austin', state: 'TX', zip: '78701' },
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.data.lead.customFields).toBeDefined()
    expect(res.body.data.lead.customFields.industry).toBe('Real Estate')
    expect(res.body.data.lead.customFields.budget).toBe(500000)
    expect(res.body.data.lead.customFields.address.city).toBe('Austin')
  })

  it('should persist customFields on lead update', async () => {
    const ts = Date.now()
    // Create lead
    const createRes = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        firstName: 'Update',
        lastName: 'CF',
        email: `update-cf-${ts}@test.com`,
        customFields: { industry: 'Finance' },
      })

    const leadId = createRes.body.data.lead.id

    // Update with new customFields (lead update is PATCH, not PUT)
    const updateRes = await request(app)
      .patch(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        customFields: {
          industry: 'Technology',
          budget: 1000000,
          website: 'https://updated.com',
        },
      })

    expect(updateRes.status).toBe(200)
    expect(updateRes.body.data.lead.customFields.industry).toBe('Technology')
    expect(updateRes.body.data.lead.customFields.budget).toBe(1000000)

    // Verify via direct DB read
    const dbLead = await prisma.lead.findUnique({ where: { id: leadId } })
    const cf = dbLead?.customFields as any
    expect(cf.industry).toBe('Technology')
    expect(cf.budget).toBe(1000000)
  })
})

// ============================================================================
// Cross-tenant message isolation
// ============================================================================

describe('Cross-tenant message isolation', () => {
  let orgAMessage: { id: string }

  beforeAll(async () => {
    orgAMessage = await prisma.message.create({
      data: {
        type: 'EMAIL',
        direction: 'OUTBOUND',
        body: 'Private Org A message',
        fromAddress: userA.email,
        toAddress: 'external@test.com',
        status: 'DELIVERED',
        organizationId: orgA.id,
        leadId: leadA.id,
      },
    })
  })

  it('should not allow Org B to read Org A messages by ID', async () => {
    const res = await request(app)
      .get(`/api/messages/${orgAMessage.id}`)
      .set('Authorization', `Bearer ${tokenB}`)

    // Should be 404 (not found in their org), not 200
    expect(res.status).toBe(404)
  })

  it('should not allow Org B to delete Org A messages', async () => {
    const res = await request(app)
      .delete(`/api/messages/${orgAMessage.id}`)
      .set('Authorization', `Bearer ${tokenB}`)

    expect(res.status).toBe(404)

    // Message should still exist
    const stillExists = await prisma.message.findUnique({ where: { id: orgAMessage.id } })
    expect(stillExists).not.toBeNull()
  })
})
