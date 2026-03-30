import { connectIntegrationSchema } from '../../src/validators/integration.validator'

describe('integration.validator', () => {
  describe('connectIntegrationSchema', () => {
    it('accepts empty object', () => {
      expect(connectIntegrationSchema.safeParse({}).success).toBe(true)
    })

    it('accepts credentials and config', () => {
      expect(connectIntegrationSchema.safeParse({
        credentials: { apiKey: 'abc' },
        config: { region: 'us-east' },
      }).success).toBe(true)
    })
  })
})
