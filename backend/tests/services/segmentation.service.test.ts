import { buildWhereFromRules } from '../../src/services/segmentation.service'

// Mock prisma (imported by segmentation.service, not used in buildWhereFromRules)
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: {},
  prisma: {},
}))

describe('buildWhereFromRules', () => {
  const orgId = 'org-1'

  it('builds equals condition', () => {
    const where = buildWhereFromRules(
      [{ field: 'status', operator: 'equals', value: 'ACTIVE' }],
      'ALL',
      orgId
    )
    expect(where.AND).toEqual(
      expect.arrayContaining([{ status: 'ACTIVE' }])
    )
  })

  it('builds notEquals condition', () => {
    const where = buildWhereFromRules(
      [{ field: 'status', operator: 'notEquals', value: 'CLOSED' }],
      'ALL',
      orgId
    )
    expect(where.AND).toEqual(
      expect.arrayContaining([{ status: { not: 'CLOSED' } }])
    )
  })

  it('builds contains condition with insensitive mode', () => {
    const where = buildWhereFromRules(
      [{ field: 'email', operator: 'contains', value: '@example.com' }],
      'ALL',
      orgId
    )
    expect(where.AND).toEqual(
      expect.arrayContaining([{ email: { contains: '@example.com', mode: 'insensitive' } }])
    )
  })

  it('builds greaterThan condition', () => {
    const where = buildWhereFromRules(
      [{ field: 'score', operator: 'greaterThan', value: 50 }],
      'ALL',
      orgId
    )
    expect(where.AND).toEqual(
      expect.arrayContaining([{ score: { gt: 50 } }])
    )
  })

  it('builds lessThan condition', () => {
    const where = buildWhereFromRules(
      [{ field: 'score', operator: 'lessThan', value: 30 }],
      'ALL',
      orgId
    )
    expect(where.AND).toEqual(
      expect.arrayContaining([{ score: { lt: 30 } }])
    )
  })

  it('builds in condition', () => {
    const where = buildWhereFromRules(
      [{ field: 'status', operator: 'in', value: ['ACTIVE', 'NEW'] }],
      'ALL',
      orgId
    )
    expect(where.AND).toEqual(
      expect.arrayContaining([{ status: { in: ['ACTIVE', 'NEW'] } }])
    )
  })

  it('uses OR connector for matchType=ANY', () => {
    const where = buildWhereFromRules(
      [
        { field: 'status', operator: 'equals', value: 'ACTIVE' },
        { field: 'status', operator: 'equals', value: 'NEW' },
      ],
      'ANY',
      orgId
    )
    expect(where.OR).toBeDefined()
    expect(where.AND).toBeUndefined()
  })

  it('uses AND connector for matchType=ALL', () => {
    const where = buildWhereFromRules(
      [
        { field: 'status', operator: 'equals', value: 'ACTIVE' },
        { field: 'score', operator: 'greaterThan', value: 50 },
      ],
      'ALL',
      orgId
    )
    expect(where.AND).toBeDefined()
    expect(where.OR).toBeUndefined()
  })

  it('builds tags includes condition', () => {
    const where = buildWhereFromRules(
      [{ field: 'tags', operator: 'includes', value: 'VIP' }],
      'ALL',
      orgId
    )
    expect(where.AND).toEqual(
      expect.arrayContaining([{ tags: { some: { name: 'VIP' } } }])
    )
  })

  it('builds tags excludes condition', () => {
    const where = buildWhereFromRules(
      [{ field: 'tags', operator: 'excludes', value: 'Spam' }],
      'ALL',
      orgId
    )
    expect(where.AND).toEqual(
      expect.arrayContaining([{ NOT: { tags: { some: { name: 'Spam' } } } }])
    )
  })
})
