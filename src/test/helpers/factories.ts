import type { User, Lead, Campaign, OrganizationInfo, UserPermissions } from '@/types'

export function createMockPermissions(overrides: Partial<UserPermissions> = {}): UserPermissions {
  return {
    canManageUsers: false,
    canManageOrg: false,
    canManageSystem: false,
    canManageFinance: false,
    canManageLeads: true,
    canManageCampaigns: true,
    canManageWorkflows: true,
    canManageIntegrations: false,
    canViewAllData: false,
    canExportData: true,
    ...overrides,
  }
}

export function createMockOrganization(overrides: Partial<OrganizationInfo> = {}): OrganizationInfo {
  return {
    id: 'org-1',
    name: 'Test Realty',
    subscriptionTier: 'PROFESSIONAL',
    memberCount: 3,
    ...overrides,
  }
}

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'agent@testrealty.com',
    firstName: 'John',
    lastName: 'Agent',
    name: 'John Agent',
    role: 'ADMIN',
    organizationId: 'org-1',
    createdAt: '2025-01-01T00:00:00Z',
    permissions: createMockPermissions(),
    organization: createMockOrganization(),
    ...overrides,
  }
}

export function createMockLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 1,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '+15551234567',
    status: 'new',
    score: 72,
    source: 'Website',
    value: 500000,
    createdAt: '2025-06-01T00:00:00Z',
    tags: ['buyer', 'first-time'],
    propertyType: 'Single Family',
    budgetMin: 400000,
    budgetMax: 600000,
    desiredLocation: 'Miami, FL',
    bedsMin: 3,
    bathsMin: 2,
    ...overrides,
  }
}

export function createMockCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'camp-1',
    name: 'Spring Open House',
    type: 'EMAIL',
    status: 'DRAFT',
    startDate: '2025-04-01T00:00:00Z',
    sent: 0,
    ...overrides,
  }
}
