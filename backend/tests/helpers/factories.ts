// Mock factories for backend test data

export function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'agent@testrealty.com',
    firstName: 'John',
    lastName: 'Agent',
    password: '$2b$10$hashedpassword',
    role: 'ADMIN',
    organizationId: 'org-1',
    emailVerified: true,
    twoFactorEnabled: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

export function createMockOrganization(overrides: Record<string, unknown> = {}) {
  return {
    id: 'org-1',
    name: 'Test Realty',
    domain: 'testrealty.com',
    subscriptionTier: 'PROFESSIONAL',
    trialEndsAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

export function createMockLead(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '+15551234567',
    status: 'NEW',
    score: 72,
    source: 'Website',
    value: 500000,
    organizationId: 'org-1',
    assignedToId: 'user-1',
    propertyType: 'Single Family',
    budgetMin: 400000,
    budgetMax: 600000,
    desiredLocation: 'Miami, FL',
    bedsMin: 3,
    bathsMin: 2,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-01'),
    ...overrides,
  }
}

export function createMockCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: 'camp-1',
    name: 'Spring Open House',
    type: 'EMAIL',
    status: 'DRAFT',
    subject: 'Open House This Weekend!',
    body: '<h1>Welcome</h1><p>Join us...</p>',
    organizationId: 'org-1',
    createdById: 'user-1',
    sent: 0,
    opened: 0,
    clicked: 0,
    converted: 0,
    scheduledDate: null,
    startDate: new Date('2025-04-01'),
    createdAt: new Date('2025-03-15'),
    updatedAt: new Date('2025-03-15'),
    ...overrides,
  }
}

export function createMockTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    title: 'Follow up with Jane',
    description: 'Call about property viewing',
    status: 'PENDING',
    priority: 'HIGH',
    dueDate: new Date('2025-07-01'),
    organizationId: 'org-1',
    assignedToId: 'user-1',
    leadId: 1,
    createdAt: new Date('2025-06-15'),
    updatedAt: new Date('2025-06-15'),
    ...overrides,
  }
}

export function createMockWorkflow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wf-1',
    name: 'New Lead Welcome',
    description: 'Send welcome email to new leads',
    status: 'ACTIVE',
    organizationId: 'org-1',
    createdById: 'user-1',
    triggerType: 'LEAD_CREATED',
    nodes: JSON.stringify([
      { id: 'trigger', type: 'trigger', data: { event: 'LEAD_CREATED' } },
      { id: 'email', type: 'send_email', data: { template: 'welcome' } },
    ]),
    createdAt: new Date('2025-03-01'),
    updatedAt: new Date('2025-03-01'),
    ...overrides,
  }
}

export function createMockNote(overrides: Record<string, unknown> = {}) {
  return {
    id: 'note-1',
    content: 'Interested in 3-bedroom properties near downtown',
    leadId: 1,
    userId: 'user-1',
    organizationId: 'org-1',
    createdAt: new Date('2025-06-10'),
    updatedAt: new Date('2025-06-10'),
    ...overrides,
  }
}

export function createMockTag(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tag-1',
    name: 'Hot Lead',
    color: '#ef4444',
    organizationId: 'org-1',
    createdAt: new Date('2025-01-01'),
    ...overrides,
  }
}

export function createMockRequestUser(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'user-1',
    email: 'agent@testrealty.com',
    role: 'ADMIN',
    organizationId: 'org-1',
    ...overrides,
  }
}
