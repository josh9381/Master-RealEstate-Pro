import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/api', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}))

import {
  sendChatMessage,
  getChatHistory,
  clearChatHistory,
} from '../aiService'

describe('aiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sendChatMessage posts to /ai/chat', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: { message: 'Hello!', tokens: 50, cost: 0.001 },
      },
    })
    const result = await sendChatMessage('Hi there')
    expect(mockPost).toHaveBeenCalledWith('/ai/chat', expect.objectContaining({
      message: 'Hi there',
      tone: 'FRIENDLY',
    }))
    expect(result.success).toBe(true)
    expect(result.data.message).toBe('Hello!')
  })

  it('sendChatMessage passes conversation history and tone', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { message: 'response', tokens: 10, cost: 0 } },
    })
    const history = [{ role: 'user', content: 'previous' }]
    await sendChatMessage('new message', history, 'PROFESSIONAL')
    expect(mockPost).toHaveBeenCalledWith('/ai/chat', expect.objectContaining({
      message: 'new message',
      conversationHistory: history,
      tone: 'PROFESSIONAL',
    }))
  })

  it('sendChatMessage includes confirmation token when provided', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { message: 'confirmed', tokens: 10, cost: 0 } },
    })
    await sendChatMessage('confirm', undefined, 'FRIENDLY', 'token123')
    expect(mockPost).toHaveBeenCalledWith('/ai/chat', expect.objectContaining({
      confirmationToken: 'token123',
    }))
  })

  it('getChatHistory fetches from /ai/chat/history', async () => {
    mockGet.mockResolvedValue({
      data: { success: true, data: { messages: [], total: 0 } },
    })
    const result = await getChatHistory(20)
    expect(mockGet).toHaveBeenCalledWith('/ai/chat/history', { params: { limit: 20 } })
    expect(result.data.messages).toEqual([])
  })

  it('getChatHistory defaults to limit 50', async () => {
    mockGet.mockResolvedValue({
      data: { success: true, data: { messages: [], total: 0 } },
    })
    await getChatHistory()
    expect(mockGet).toHaveBeenCalledWith('/ai/chat/history', { params: { limit: 50 } })
  })

  it('clearChatHistory deletes /ai/chat/history', async () => {
    mockDelete.mockResolvedValue({
      data: { success: true, data: { deleted: 5 } },
    })
    const result = await clearChatHistory()
    expect(mockDelete).toHaveBeenCalledWith('/ai/chat/history')
    expect(result.data.deleted).toBe(5)
  })
})
