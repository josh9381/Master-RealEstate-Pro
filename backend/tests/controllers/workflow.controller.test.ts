import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

import { getWorkflows, getWorkflow, createWorkflow, updateWorkflow, deleteWorkflow, toggleWorkflow } from '../../src/controllers/workflow.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, validatedQuery: query, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' }, ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

beforeEach(() => mockReset(mockPrisma))

describe('workflow.controller', () => {
  describe('getWorkflows', () => {
    it('returns workflows', async () => {
      const { req, res } = mockReqRes()
      mockPrisma.workflow.findMany.mockResolvedValue([{ id: 'w1', name: 'Test Workflow' }] as any)

      await getWorkflows(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('getWorkflow', () => {
    it('returns workflow by id', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'w1' })
      mockPrisma.workflow.findFirst.mockResolvedValue({ id: 'w1', name: 'WF' } as any)

      await getWorkflow(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })

    it('throws NotFoundError when missing', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'bad' })
      mockPrisma.workflow.findFirst.mockResolvedValue(null)

      await expect(getWorkflow(req, res)).rejects.toThrow(/not found/i)
    })
  })

  describe('createWorkflow', () => {
    it('creates workflow', async () => {
      const { req, res } = mockReqRes({}, {
        name: 'New Workflow',
        triggerType: 'LEAD_CREATED',
        actions: [{ type: 'SEND_EMAIL', config: { templateId: 't1' } }],
      })
      mockPrisma.workflow.create.mockResolvedValue({ id: 'w1', name: 'New Workflow' } as any)

      await createWorkflow(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('updateWorkflow', () => {
    it('updates workflow', async () => {
      const { req, res } = mockReqRes({}, { name: 'Updated' }, { id: 'w1' })
      mockPrisma.workflow.findFirst.mockResolvedValue({ id: 'w1' } as any)
      mockPrisma.workflow.update.mockResolvedValue({ id: 'w1', name: 'Updated' } as any)

      await updateWorkflow(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('deleteWorkflow', () => {
    it('deletes workflow', async () => {
      const { req, res } = mockReqRes({}, {}, { id: 'w1' })
      mockPrisma.workflow.findFirst.mockResolvedValue({ id: 'w1' } as any)
      mockPrisma.workflow.delete.mockResolvedValue({ id: 'w1' } as any)

      await deleteWorkflow(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('toggleWorkflow', () => {
    it('toggles workflow active state', async () => {
      const { req, res } = mockReqRes({}, { isActive: true }, { id: 'w1' })
      mockPrisma.workflow.findFirst.mockResolvedValue({ id: 'w1', isActive: false } as any)
      mockPrisma.workflow.update.mockResolvedValue({ id: 'w1', isActive: true } as any)

      await toggleWorkflow(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
