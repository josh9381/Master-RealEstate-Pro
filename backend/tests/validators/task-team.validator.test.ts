import { createTaskSchema, updateTaskSchema, taskIdSchema, listTasksQuerySchema, completeTaskSchema } from '../../src/validators/task.validator'
import { createTeamSchema, updateTeamSchema, inviteMemberSchema, updateMemberRoleSchema } from '../../src/validators/team.validator'

describe('task.validator', () => {
  describe('createTaskSchema', () => {
    const valid = { title: 'Follow up', dueDate: '2026-12-01T00:00:00Z' }

    it('accepts valid task', () => {
      expect(createTaskSchema.safeParse(valid).success).toBe(true)
    })

    it('rejects missing title', () => {
      expect(createTaskSchema.safeParse({ dueDate: '2026-12-01T00:00:00Z' }).success).toBe(false)
    })

    it('rejects missing dueDate', () => {
      expect(createTaskSchema.safeParse({ title: 'X' }).success).toBe(false)
    })

    it('accepts all priorities', () => {
      ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].forEach((priority) => {
        expect(createTaskSchema.safeParse({ ...valid, priority }).success).toBe(true)
      })
    })

    it('accepts all statuses', () => {
      ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].forEach((status) => {
        expect(createTaskSchema.safeParse({ ...valid, status }).success).toBe(true)
      })
    })

    it('accepts nullable leadId', () => {
      expect(createTaskSchema.safeParse({ ...valid, leadId: null }).success).toBe(true)
    })
  })

  describe('updateTaskSchema', () => {
    it('accepts partial update', () => {
      expect(updateTaskSchema.safeParse({ title: 'Updated' }).success).toBe(true)
    })

    it('accepts null description', () => {
      expect(updateTaskSchema.safeParse({ description: null }).success).toBe(true)
    })
  })

  describe('taskIdSchema', () => {
    it('accepts non-empty id', () => {
      expect(taskIdSchema.safeParse({ id: 'abc' }).success).toBe(true)
    })
  })

  describe('listTasksQuerySchema', () => {
    it('applies defaults', () => {
      const res = listTasksQuerySchema.safeParse({})
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.page).toBe(1)
        expect(res.data.limit).toBe(20)
        expect(res.data.sortBy).toBe('dueDate')
        expect(res.data.sortOrder).toBe('asc')
      }
    })

    it('transforms numeric strings', () => {
      const res = listTasksQuerySchema.safeParse({ page: '3' })
      if (res.success) expect(res.data.page).toBe(3)
    })
  })

  describe('completeTaskSchema', () => {
    it('accepts optional completedAt', () => {
      expect(completeTaskSchema.safeParse({ completedAt: '2026-01-01T00:00:00Z' }).success).toBe(true)
    })

    it('accepts empty object', () => {
      expect(completeTaskSchema.safeParse({}).success).toBe(true)
    })
  })
})

describe('team.validator', () => {
  describe('createTeamSchema', () => {
    it('accepts valid team', () => {
      expect(createTeamSchema.safeParse({ name: 'Sales Team' }).success).toBe(true)
    })

    it('rejects empty name', () => {
      expect(createTeamSchema.safeParse({ name: '' }).success).toBe(false)
    })

    it('validates slug format', () => {
      expect(createTeamSchema.safeParse({ name: 'X', slug: 'sales-team' }).success).toBe(true)
      expect(createTeamSchema.safeParse({ name: 'X', slug: 'INVALID SLUG' }).success).toBe(false)
    })
  })

  describe('updateTeamSchema', () => {
    it('accepts partial update', () => {
      expect(updateTeamSchema.safeParse({ name: 'Updated' }).success).toBe(true)
    })
  })

  describe('inviteMemberSchema', () => {
    it('accepts valid invite', () => {
      expect(inviteMemberSchema.safeParse({ email: 'a@b.com' }).success).toBe(true)
    })

    it('defaults role to MEMBER', () => {
      const res = inviteMemberSchema.safeParse({ email: 'a@b.com' })
      if (res.success) expect(res.data.role).toBe('MEMBER')
    })

    it('accepts all roles', () => {
      ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'].forEach((role) => {
        expect(inviteMemberSchema.safeParse({ email: 'a@b.com', role }).success).toBe(true)
      })
    })

    it('rejects invalid email', () => {
      expect(inviteMemberSchema.safeParse({ email: 'bad' }).success).toBe(false)
    })
  })

  describe('updateMemberRoleSchema', () => {
    it('accepts valid role', () => {
      expect(updateMemberRoleSchema.safeParse({ role: 'ADMIN' }).success).toBe(true)
    })

    it('rejects invalid role', () => {
      expect(updateMemberRoleSchema.safeParse({ role: 'SUPERUSER' }).success).toBe(false)
    })
  })
})
