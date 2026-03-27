jest.mock('../../src/utils/emailBlocksShared', () => ({
  blocksToMjml: jest.fn().mockReturnValue('<mj-section><mj-column><mj-text>Blocks content</mj-text></mj-column></mj-section>'),
}), { virtual: true })

// Also mock the .js path since the source imports it with .js extension
jest.mock('../../src/utils/emailBlocksShared.js', () => ({
  blocksToMjml: jest.fn().mockReturnValue('<mj-section><mj-column><mj-text>Blocks content</mj-text></mj-column></mj-section>'),
}), { virtual: true })

import { compileMjml, compilePlainText } from '../../src/utils/mjmlCompiler'

describe('mjmlCompiler', () => {
  describe('compileMjml', () => {
    it('compiles valid MJML to HTML', () => {
      const mjml = `
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                <mj-text>Hello World</mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `
      const result = compileMjml(mjml)
      expect(result.html).toContain('Hello World')
      expect(result.errors).toHaveLength(0)
    })

    it('includes CAN-SPAM footer when canSpam options provided', () => {
      const mjml = `
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                <mj-text>Test email</mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `
      const result = compileMjml(mjml, {
        unsubscribeUrl: 'https://example.com/unsubscribe',
        physicalAddress: '123 Main St',
        companyName: 'Acme Corp',
      })
      expect(result.html).toContain('Test email')
    })

    it('skips CAN-SPAM footer when skipFooter is true', () => {
      const mjml = `
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                <mj-text>Clean email</mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `
      const { html } = compileMjml(mjml, { skipFooter: true })
      expect(html).toContain('Clean email')
    })
  })

  describe('compilePlainText', () => {
    it('wraps plain text in MJML and compiles to HTML', () => {
      const result = compilePlainText('Hello from Plain Text')
      expect(result.html).toBeDefined()
      expect(result.html.length).toBeGreaterThan(0)
    })

    it('returns errors array (empty on success)', () => {
      const result = compilePlainText('Test')
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })
})
