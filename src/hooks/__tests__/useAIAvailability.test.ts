import { getAIUnavailableMessage } from '@/hooks/useAIAvailability'

describe('getAIUnavailableMessage', () => {
  it('returns message for 503 status', () => {
    const error = { response: { status: 503 } }
    const msg = getAIUnavailableMessage(error)
    expect(msg).toContain('AI features are not configured')
  })

  it('returns message for 500 status with OPENAI_API_KEY mention', () => {
    const error = {
      response: { status: 500, data: { message: 'OPENAI_API_KEY not set' } },
    }
    const msg = getAIUnavailableMessage(error)
    expect(msg).toContain('AI features are not configured')
  })

  it('returns null for generic errors', () => {
    const error = { response: { status: 400, data: { message: 'Bad request' } } }
    expect(getAIUnavailableMessage(error)).toBeNull()
  })

  it('returns null for non-object errors', () => {
    expect(getAIUnavailableMessage('string error')).toBeNull()
    expect(getAIUnavailableMessage(null)).toBeNull()
    expect(getAIUnavailableMessage(undefined)).toBeNull()
  })

  it('returns null for 500 without OPENAI_API_KEY in message', () => {
    const error = { response: { status: 500, data: { message: 'Internal server error' } } }
    expect(getAIUnavailableMessage(error)).toBeNull()
  })
})
