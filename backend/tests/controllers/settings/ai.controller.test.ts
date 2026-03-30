jest.mock('../../../src/services/ai-config.service', () => ({
  getOrgAISettings: jest.fn().mockResolvedValue({ provider: 'openai', model: 'gpt-4' }),
  updateOrgAISettings: jest.fn().mockResolvedValue({ provider: 'openai', model: 'gpt-4' }),
}))
jest.mock('../../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

import { getAISettings, updateAISettings } from '../../../src/controllers/settings/ai.controller'

function mockReqRes(query = {}, body = {}, params = {}) {
  return {
    req: { query, body, params, user: { userId: 'u1', organizationId: 'org-1', role: 'ADMIN', email: 'a@test.com' } } as any,
    res: { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any,
  }
}

describe('settings/ai.controller', () => {
  describe('getAISettings', () => {
    it('returns AI settings', async () => {
      const { req, res } = mockReqRes()
      await getAISettings(req, res)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })

  describe('updateAISettings', () => {
    it('updates AI settings', async () => {
      const { req, res } = mockReqRes({}, { provider: 'openai', model: 'gpt-4' })
      await updateAISettings(req, res)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    })
  })
})
