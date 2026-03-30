import { PrismaClient } from '@prisma/client'
import { mockDeep } from 'jest-mock-extended'

const mockPrisma = mockDeep<PrismaClient>()

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))

jest.mock('exceljs', () => {
  const mockRow = { font: {}, fill: {}, alignment: {} }
  const mockWorksheet = {
    columns: [],
    addRow: jest.fn(),
    getRow: jest.fn().mockReturnValue(mockRow),
    rowCount: 0,
    autoFilter: null as any,
    views: [] as any[],
  }
  const mockWorkbook = {
    creator: '',
    created: null as any,
    addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
    xlsx: { write: jest.fn().mockResolvedValue(undefined) },
    csv: { write: jest.fn().mockResolvedValue(undefined) },
  }
  return { Workbook: jest.fn().mockImplementation(() => mockWorkbook) }
})

jest.mock('../../src/utils/metricsCalculator', () => ({
  formatRate: jest.fn((v: number) => `${v}%`),
  calcOpenRate: jest.fn().mockReturnValue(50),
  calcClickRate: jest.fn().mockReturnValue(20),
  calcBounceRate: jest.fn().mockReturnValue(5),
}))

import { exportToResponse, ExportOptions } from '../../src/services/export.service'

describe('export.service', () => {
  const mockRes = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    end: jest.fn(),
    write: jest.fn(),
    pipe: jest.fn(),
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('exports leads as xlsx', async () => {
    mockPrisma.lead.findMany.mockResolvedValue([
      {
        id: 'l1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        phone: '555-1234',
        company: 'Acme',
        status: 'NEW',
        source: 'WEB',
        score: 80,
        estimatedValue: null,
        tags: [],
        assignedTo: null,
        createdAt: new Date(),
        lastContactedAt: null,
        notes: null,
      } as any,
    ])

    const options: ExportOptions = {
      organizationId: 'org1',
      format: 'xlsx',
      type: 'leads',
    }

    await exportToResponse(mockRes, options)
    expect(mockRes.setHeader).toHaveBeenCalled()
  })

  it('exports campaigns as csv', async () => {
    mockPrisma.campaign.findMany.mockResolvedValue([])

    const options: ExportOptions = {
      organizationId: 'org1',
      format: 'csv',
      type: 'campaigns',
    }

    await exportToResponse(mockRes, options)
    expect(mockRes.setHeader).toHaveBeenCalled()
  })

  it('exports activities', async () => {
    mockPrisma.activity.findMany.mockResolvedValue([])

    const options: ExportOptions = {
      organizationId: 'org1',
      format: 'xlsx',
      type: 'activities',
    }

    await exportToResponse(mockRes, options)
    expect(mockRes.setHeader).toHaveBeenCalled()
  })
})
