import {
  hasFullAccess,
  getRoleBasedWhere,
  getRoleFilterFromRequest,
  canAccessResource,
  getLeadsFilter,
  getCampaignsFilter,
  getActivitiesFilter,
  getTasksFilter,
  getMessagesFilter,
} from '../../src/utils/roleFilters'

describe('roleFilters', () => {
  const adminOptions = { userId: 'admin-1', role: 'ADMIN' as any, organizationId: 'org-1' }
  const managerOptions = { userId: 'mgr-1', role: 'MANAGER' as any, organizationId: 'org-1' }
  const userOptions = { userId: 'user-1', role: 'USER' as any, organizationId: 'org-1' }

  describe('hasFullAccess', () => {
    it('returns true for ADMIN', () => {
      expect(hasFullAccess('ADMIN' as any)).toBe(true)
    })

    it('returns true for MANAGER', () => {
      expect(hasFullAccess('MANAGER' as any)).toBe(true)
    })

    it('returns false for USER', () => {
      expect(hasFullAccess('USER' as any)).toBe(false)
    })
  })

  describe('getRoleBasedWhere', () => {
    it('returns org-only filter for ADMIN', () => {
      const result = getRoleBasedWhere(adminOptions)
      expect(result).toEqual({ organizationId: 'org-1' })
      expect(result).not.toHaveProperty('OR')
    })

    it('returns org-only filter for MANAGER', () => {
      const result = getRoleBasedWhere(managerOptions)
      expect(result).toEqual({ organizationId: 'org-1' })
    })

    it('returns org + OR filter for USER', () => {
      const result = getRoleBasedWhere(userOptions)
      expect(result).toHaveProperty('organizationId', 'org-1')
      expect(result).toHaveProperty('OR')
      expect((result as any).OR).toEqual([
        { assignedToId: 'user-1' },
        { createdById: 'user-1' },
        { userId: 'user-1' },
      ])
    })

    it('merges additional where conditions', () => {
      const result = getRoleBasedWhere(adminOptions, { status: 'ACTIVE' })
      expect(result).toEqual({ organizationId: 'org-1', status: 'ACTIVE' })
    })
  })

  describe('getRoleFilterFromRequest', () => {
    it('extracts role filter from authenticated request', () => {
      const req = {
        user: { userId: 'u1', role: 'ADMIN', organizationId: 'org-1' },
      } as any
      const result = getRoleFilterFromRequest(req)
      expect(result).toEqual({ userId: 'u1', role: 'ADMIN', organizationId: 'org-1' })
    })

    it('throws if user not authenticated', () => {
      expect(() => getRoleFilterFromRequest({ user: undefined } as any)).toThrow('User not authenticated')
    })
  })

  describe('canAccessResource', () => {
    it('ADMIN can access any resource', () => {
      expect(canAccessResource('ADMIN' as any, 'admin-1', 'other-user', 'other-user')).toBe(true)
    })

    it('MANAGER can access any resource', () => {
      expect(canAccessResource('MANAGER' as any, 'mgr-1', 'other-user', null)).toBe(true)
    })

    it('USER can access owned resource', () => {
      expect(canAccessResource('USER' as any, 'user-1', 'user-1', null)).toBe(true)
    })

    it('USER can access assigned resource', () => {
      expect(canAccessResource('USER' as any, 'user-1', 'other', 'user-1')).toBe(true)
    })

    it('USER cannot access other users resource', () => {
      expect(canAccessResource('USER' as any, 'user-1', 'other', 'other')).toBe(false)
    })

    it('USER cannot access when both owner and assignee are null', () => {
      expect(canAccessResource('USER' as any, 'user-1', null, null)).toBe(false)
    })
  })

  describe('getLeadsFilter', () => {
    it('ADMIN sees all leads in org', () => {
      const result = getLeadsFilter(adminOptions)
      expect(result).toEqual({ organizationId: 'org-1' })
    })

    it('USER sees only assigned leads', () => {
      const result = getLeadsFilter(userOptions)
      expect(result).toHaveProperty('organizationId', 'org-1')
      expect(result).toHaveProperty('assignedToId', 'user-1')
    })

    it('merges additional conditions', () => {
      const result = getLeadsFilter(userOptions, { status: 'NEW' })
      expect(result).toHaveProperty('status', 'NEW')
      expect(result).toHaveProperty('assignedToId', 'user-1')
    })
  })

  describe('getCampaignsFilter', () => {
    it('ADMIN sees all campaigns', () => {
      const result = getCampaignsFilter(adminOptions)
      expect(result).toEqual({ organizationId: 'org-1' })
    })

    it('USER sees only own campaigns', () => {
      const result = getCampaignsFilter(userOptions)
      expect(result).toHaveProperty('organizationId', 'org-1')
      expect(result).toHaveProperty('createdById', 'user-1')
    })
  })

  describe('getActivitiesFilter', () => {
    it('ADMIN sees all activities', () => {
      const result = getActivitiesFilter(adminOptions)
      expect(result).toEqual({ organizationId: 'org-1' })
    })

    it('USER sees only own or assigned activities', () => {
      const result = getActivitiesFilter(userOptions)
      expect(result).toHaveProperty('organizationId', 'org-1')
      expect((result as any).OR).toEqual([
        { userId: 'user-1' },
        { lead: { assignedToId: 'user-1' } },
      ])
    })
  })

  describe('getTasksFilter', () => {
    it('ADMIN sees all tasks (no org filter)', () => {
      const result = getTasksFilter(adminOptions)
      expect(result).toEqual({})
    })

    it('USER sees only assigned tasks', () => {
      const result = getTasksFilter(userOptions)
      expect(result).toEqual({ assignedToId: 'user-1' })
    })

    it('merges additional where', () => {
      const result = getTasksFilter(userOptions, { status: 'PENDING' })
      expect(result).toEqual({ status: 'PENDING', assignedToId: 'user-1' })
    })
  })

  describe('getMessagesFilter', () => {
    it('ADMIN sees all messages', () => {
      const result = getMessagesFilter(adminOptions)
      expect(result).toEqual({ organizationId: 'org-1' })
    })

    it('USER sees only messages for assigned leads or no-lead messages', () => {
      const result = getMessagesFilter(userOptions)
      expect(result).toHaveProperty('organizationId', 'org-1')
      expect((result as any).OR).toBeDefined()
      expect((result as any).OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ lead: { assignedToId: 'user-1' } }),
        ])
      )
    })
  })
})
