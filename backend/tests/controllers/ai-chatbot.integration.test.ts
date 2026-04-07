/**
 * Comprehensive AI chatbot integration tests.
 * Tests the full chatWithAI flow: regular chat, function calling,
 * destructive confirmation gates, admin-only blocking, history
 * truncation, and error handling — all with mocked OpenAI.
 */
import { mockDeep, mockReset } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'

// ── Mocks (must be defined before imports) ── //
const mockPrisma = mockDeep<PrismaClient>()
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

const mockOpenAI = {
  chat: jest.fn(),
  chatWithFunctions: jest.fn(),
}
jest.mock('../../src/services/openai.service', () => ({
  getOpenAIService: jest.fn(() => mockOpenAI),
  ASSISTANT_TONES: {
    PROFESSIONAL: { temperature: 0.5, systemAddition: 'Maintain formal tone' },
    FRIENDLY: { temperature: 0.7, systemAddition: 'Be warm and approachable' },
    DIRECT: { temperature: 0.4, systemAddition: 'Get straight to the point' },
    COACHING: { temperature: 0.7, systemAddition: 'Act as mentor and coach' },
    CASUAL: { temperature: 0.8, systemAddition: 'Be relaxed and casual' },
  },
}))

const mockExecuteFunction = jest.fn()
jest.mock('../../src/services/ai-functions.service', () => {
  const actual = jest.requireActual('../../src/services/ai-function-definitions')
  return {
    getAIFunctionsService: jest.fn(() => ({
      executeFunction: mockExecuteFunction,
      isDestructiveFunction: (name: string) => actual.DESTRUCTIVE_FUNCTIONS.has(name),
      isAdminOnlyFunction: (name: string) => actual.ADMIN_ONLY_FUNCTIONS.has(name),
    })),
    AI_FUNCTIONS: actual.AI_FUNCTIONS,
    DESTRUCTIVE_FUNCTIONS: actual.DESTRUCTIVE_FUNCTIONS,
    ADMIN_ONLY_FUNCTIONS: actual.ADMIN_ONLY_FUNCTIONS,
    READ_ONLY_FUNCTIONS: actual.READ_ONLY_FUNCTIONS,
  }
})

jest.mock('../../src/services/usage-tracking.service', () => ({
  incrementAIUsage: jest.fn(),
}))

jest.mock('../../src/services/intelligence.service', () => ({
  getIntelligenceService: jest.fn(() => ({
    enhanceMessage: jest.fn().mockResolvedValue({ enhanced: 'Better message' }),
    suggestActions: jest.fn().mockResolvedValue([]),
  })),
}))

jest.mock('../../src/config/redis', () => ({
  getRedisClient: jest.fn(() => null),
}))

import { chatWithAI, getChatHistory, clearChatHistory, enhanceMessage, suggestActions } from '../../src/controllers/ai-chat.controller'
import { incrementAIUsage } from '../../src/services/usage-tracking.service'

// ── Helpers ── //
function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    body: { message: 'Hello AI', conversationHistory: [], tone: 'FRIENDLY', ...overrides },
    query: {},
    user: {
      userId: 'user-1',
      organizationId: 'org-1',
      role: 'ADMIN',
      email: 'admin@test.com',
    },
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
  } as any
}

function mockRes() {
  const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
  return res
}

// ── Setup ── //
const originalEnv = process.env.OPENAI_API_KEY
beforeAll(() => {
  process.env.OPENAI_API_KEY = 'sk-test-key-for-testing-only'
})
afterAll(() => {
  if (originalEnv !== undefined) process.env.OPENAI_API_KEY = originalEnv
  else delete process.env.OPENAI_API_KEY
})

beforeEach(() => {
  jest.clearAllMocks()
  mockReset(mockPrisma)
  mockPrisma.chatMessage.create.mockResolvedValue({} as any)
})

// ───────────────────────────────────────────
// 1. REGULAR CHAT (no function call)
// ───────────────────────────────────────────
describe('chatWithAI – regular chat', () => {
  it('returns AI response and persists messages', async () => {
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: 'I can help with that!',
      tokens: 100,
      cost: 0.003,
      functionCall: null,
    })
    const req = mockReq()
    const res = mockRes()

    await chatWithAI(req, res)

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        message: 'I can help with that!',
        tokens: 100,
        cost: 0.003,
      },
    })
    // Persists user + assistant messages
    expect(mockPrisma.chatMessage.create).toHaveBeenCalledTimes(2)
    // Tracks usage
    expect(incrementAIUsage).toHaveBeenCalledWith('org-1', 'aiMessages', { tokens: 100, cost: 0.003 })
  })

  it('uses the specified tone', async () => {
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: 'Direct answer.',
      tokens: 50,
      cost: 0.001,
      functionCall: null,
    })
    const req = mockReq({ tone: 'DIRECT' })
    const res = mockRes()

    await chatWithAI(req, res)

    // Verify system prompt includes DIRECT tone
    const callArgs = mockOpenAI.chatWithFunctions.mock.calls[0][0]
    expect(callArgs[0].content).toContain('Get straight to the point')
  })

  it('rejects empty messages', async () => {
    const req = mockReq({ message: '' })
    const res = mockRes()

    await chatWithAI(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Message is required' }),
    )
  })

  it('rejects non-string messages', async () => {
    const req = mockReq({ message: 123 })
    const res = mockRes()

    await chatWithAI(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 503 when OPENAI_API_KEY is missing', async () => {
    const savedKey = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY

    const req = mockReq()
    const res = mockRes()

    await chatWithAI(req, res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('OPENAI_API_KEY') }),
    )
    process.env.OPENAI_API_KEY = savedKey
  })

  it('handles OpenAI service errors gracefully', async () => {
    mockOpenAI.chatWithFunctions.mockRejectedValue(new Error('OpenAI rate limit'))
    const req = mockReq()
    const res = mockRes()

    await chatWithAI(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    )
  })
})

// ───────────────────────────────────────────
// 2. FUNCTION CALLING (non-destructive)
// ───────────────────────────────────────────
describe('chatWithAI – function calling', () => {
  it('executes non-destructive function and returns final response', async () => {
    // First call: GPT returns a function call
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: null,
      tokens: 80,
      cost: 0.002,
      functionCall: {
        name: 'get_lead_count',
        arguments: { status: 'NEW' },
      },
    })
    // Function execution result
    mockExecuteFunction.mockResolvedValue(JSON.stringify({ count: 42 }))
    // Second call: GPT formats the response
    mockOpenAI.chat.mockResolvedValue({
      response: 'You have 42 new leads!',
      tokens: 30,
      cost: 0.001,
    })

    const req = mockReq({ message: 'How many new leads do I have?' })
    const res = mockRes()

    await chatWithAI(req, res)

    // Function was executed
    expect(mockExecuteFunction).toHaveBeenCalledWith(
      'get_lead_count',
      { status: 'NEW' },
      'org-1',
      'user-1',
      'ADMIN',
    )
    // Final response returned
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        message: 'You have 42 new leads!',
        tokens: 110, // 80 + 30
        cost: 0.003, // 0.002 + 0.001
        functionUsed: 'get_lead_count',
      },
    })
    // 2 chat messages persisted (user + assistant)
    expect(mockPrisma.chatMessage.create).toHaveBeenCalledTimes(2)
  })

  it('executes create_lead function and returns result', async () => {
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: null,
      tokens: 90,
      cost: 0.002,
      functionCall: {
        name: 'create_lead',
        arguments: { firstName: 'John', lastName: 'Smith', email: 'john@test.com' },
      },
    })
    mockExecuteFunction.mockResolvedValue(JSON.stringify({
      success: true,
      lead: { id: 'lead-1', name: 'John Smith', email: 'john@test.com' },
    }))
    mockOpenAI.chat.mockResolvedValue({
      response: '✅ Created lead: John Smith',
      tokens: 25,
      cost: 0.001,
    })

    const req = mockReq({ message: 'Add a new lead John Smith john@test.com' })
    const res = mockRes()

    await chatWithAI(req, res)

    expect(mockExecuteFunction).toHaveBeenCalledWith(
      'create_lead',
      expect.objectContaining({ firstName: 'John', lastName: 'Smith' }),
      'org-1',
      'user-1',
      'ADMIN',
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ functionUsed: 'create_lead' }),
      }),
    )
  })

  it('passes search_leads results back to GPT for formatting', async () => {
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: null,
      tokens: 70,
      cost: 0.002,
      functionCall: {
        name: 'search_leads',
        arguments: { query: 'john' },
      },
    })
    mockExecuteFunction.mockResolvedValue(JSON.stringify({
      leads: [
        { id: '1', firstName: 'John', lastName: 'Doe', status: 'NEW' },
        { id: '2', firstName: 'John', lastName: 'Smith', status: 'CONTACTED' },
      ],
    }))
    mockOpenAI.chat.mockResolvedValue({
      response: 'Found 2 leads named John: John Doe (NEW) and John Smith (CONTACTED)',
      tokens: 40,
      cost: 0.001,
    })

    const req = mockReq({ message: 'Search for John' })
    const res = mockRes()

    await chatWithAI(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          message: expect.stringContaining('John'),
          functionUsed: 'search_leads',
        }),
      }),
    )
  })
})

// ───────────────────────────────────────────
// 3. DESTRUCTIVE FUNCTION CONFIRMATION GATE
// ───────────────────────────────────────────
describe('chatWithAI – destructive actions', () => {
  it('returns confirmation token for destructive functions', async () => {
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: null,
      tokens: 60,
      cost: 0.002,
      functionCall: {
        name: 'delete_lead',
        arguments: { leadId: 'lead-123' },
      },
    })

    const req = mockReq({ message: 'Delete lead 123' })
    const res = mockRes()

    await chatWithAI(req, res)

    const responseData = res.json.mock.calls[0][0]
    expect(responseData.success).toBe(true)
    expect(responseData.data.requiresConfirmation).toBe(true)
    expect(responseData.data.confirmationToken).toBeDefined()
    expect(responseData.data.confirmationToken.length).toBe(64) // 32 bytes hex
    expect(responseData.data.pendingFunction.name).toBe('delete_lead')
    // Function should NOT have been executed yet
    expect(mockExecuteFunction).not.toHaveBeenCalled()
  })

  it('executes destructive function when valid token is provided', async () => {
    // Step 1: Get confirmation token
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: null,
      tokens: 60,
      cost: 0.002,
      functionCall: {
        name: 'delete_lead',
        arguments: { leadId: 'lead-123' },
      },
    })

    const req1 = mockReq({ message: 'Delete lead 123' })
    const res1 = mockRes()
    await chatWithAI(req1, res1)

    const token = res1.json.mock.calls[0][0].data.confirmationToken

    // Step 2: Confirm with token
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: null,
      tokens: 60,
      cost: 0.002,
      functionCall: {
        name: 'delete_lead',
        arguments: { leadId: 'lead-123' },
      },
    })
    mockExecuteFunction.mockResolvedValue(JSON.stringify({ success: true, message: 'Lead deleted' }))
    mockOpenAI.chat.mockResolvedValue({
      response: '✅ Lead deleted successfully.',
      tokens: 20,
      cost: 0.001,
    })

    const req2 = mockReq({ message: 'Delete lead 123', confirmationToken: token })
    const res2 = mockRes()
    await chatWithAI(req2, res2)

    expect(mockExecuteFunction).toHaveBeenCalledWith(
      'delete_lead',
      expect.objectContaining({ leadId: 'lead-123' }),
      'org-1',
      'user-1',
      'ADMIN',
    )
    expect(res2.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ functionUsed: 'delete_lead' }),
      }),
    )
  })

  it('rejects invalid confirmation tokens', async () => {
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: null,
      tokens: 60,
      cost: 0.002,
      functionCall: {
        name: 'delete_lead',
        arguments: { leadId: 'lead-123' },
      },
    })

    const req = mockReq({
      message: 'Delete lead 123',
      confirmationToken: 'invalid-token-abcdef',
    })
    const res = mockRes()

    await chatWithAI(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockExecuteFunction).not.toHaveBeenCalled()
  })

  it('requires confirmation for send_email', async () => {
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: null,
      tokens: 70,
      cost: 0.002,
      functionCall: {
        name: 'send_email',
        arguments: { leadId: 'lead-1', subject: 'Hello', body: 'Hi there' },
      },
    })

    const req = mockReq({ message: 'Send email to lead 1' })
    const res = mockRes()

    await chatWithAI(req, res)

    const responseData = res.json.mock.calls[0][0]
    expect(responseData.data.requiresConfirmation).toBe(true)
    expect(responseData.data.pendingFunction.name).toBe('send_email')
    expect(mockExecuteFunction).not.toHaveBeenCalled()
  })

  it('requires confirmation for send_sms', async () => {
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: null,
      tokens: 70,
      cost: 0.002,
      functionCall: {
        name: 'send_sms',
        arguments: { leadId: 'lead-1', body: 'Hi there' },
      },
    })

    const req = mockReq({ message: 'Text lead 1' })
    const res = mockRes()

    await chatWithAI(req, res)

    expect(res.json.mock.calls[0][0].data.requiresConfirmation).toBe(true)
  })

  it('requires confirmation for bulk_delete_leads', async () => {
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: null,
      tokens: 70,
      cost: 0.002,
      functionCall: {
        name: 'bulk_delete_leads',
        arguments: { leadIds: ['lead-1', 'lead-2'] },
      },
    })

    const req = mockReq({ message: 'Delete all unqualified leads' })
    const res = mockRes()

    await chatWithAI(req, res)

    expect(res.json.mock.calls[0][0].data.requiresConfirmation).toBe(true)
  })
})

// ───────────────────────────────────────────
// 4. ADMIN-ONLY FUNCTION BLOCKING
// ───────────────────────────────────────────
describe('chatWithAI – role-based access', () => {
  it('blocks admin-only functions for AGENT role', async () => {
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: null,
      tokens: 60,
      cost: 0.002,
      functionCall: {
        name: 'bulk_delete_leads',
        arguments: { leadIds: ['lead-1'] },
      },
    })

    const req = mockReq({ message: 'Delete leads' })
    req.user.role = 'AGENT'
    const res = mockRes()

    await chatWithAI(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('admin or manager'),
      }),
    )
    expect(mockExecuteFunction).not.toHaveBeenCalled()
  })

  it('allows admin-only functions for MANAGER role', async () => {
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: null,
      tokens: 60,
      cost: 0.002,
      functionCall: {
        name: 'delete_lead',
        arguments: { leadId: 'lead-1' },
      },
    })

    const req = mockReq({ message: 'Delete lead 1' })
    req.user.role = 'MANAGER'
    const res = mockRes()

    await chatWithAI(req, res)

    // Should proceed to confirmation gate (not blocked by role)
    const responseData = res.json.mock.calls[0][0]
    expect(responseData.data.requiresConfirmation).toBe(true)
  })

  it('allows read-only functions for AGENT role', async () => {
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: null,
      tokens: 60,
      cost: 0.002,
      functionCall: {
        name: 'get_lead_count',
        arguments: {},
      },
    })
    mockExecuteFunction.mockResolvedValue(JSON.stringify({ count: 10 }))
    mockOpenAI.chat.mockResolvedValue({
      response: 'You have 10 leads.',
      tokens: 20,
      cost: 0.001,
    })

    const req = mockReq({ message: 'How many leads?' })
    req.user.role = 'AGENT'
    const res = mockRes()

    await chatWithAI(req, res)

    expect(mockExecuteFunction).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ message: 'You have 10 leads.' }),
      }),
    )
  })
})

// ───────────────────────────────────────────
// 5. CONVERSATION HISTORY TRUNCATION
// ───────────────────────────────────────────
describe('chatWithAI – history truncation', () => {
  it('truncates history beyond 20 messages', async () => {
    const longHistory = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }))
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: 'Response',
      tokens: 50,
      cost: 0.001,
      functionCall: null,
    })

    const req = mockReq({ message: 'Latest', conversationHistory: longHistory })
    const res = mockRes()

    await chatWithAI(req, res)

    // System prompt + last 20 history + current user message = 22 messages
    const callArgs = mockOpenAI.chatWithFunctions.mock.calls[0][0]
    // System (1) + trimmed history (20) + current message (1) = 22
    expect(callArgs.length).toBeLessThanOrEqual(22)
    // Last history message should be the most recent
    const historyPortion = callArgs.slice(1, -1) // exclude system and current message
    expect(historyPortion[historyPortion.length - 1].content).toBe('Message 29')
  })

  it('truncates history exceeding character limit', async () => {
    const bigMessage = 'x'.repeat(15000)
    const longHistory = Array.from({ length: 5 }, (_, i) => ({
      role: 'user',
      content: bigMessage, // 5 x 15000 = 75000 chars > 40000 limit
    }))
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: 'OK',
      tokens: 10,
      cost: 0.001,
      functionCall: null,
    })

    const req = mockReq({ message: 'test', conversationHistory: longHistory })
    const res = mockRes()

    await chatWithAI(req, res)

    // Should have trimmed some messages to get under 40000 chars
    const callArgs = mockOpenAI.chatWithFunctions.mock.calls[0][0]
    const totalHistoryChars = callArgs
      .slice(1, -1) // exclude system and current message
      .reduce((sum: number, m: { content: string }) => sum + (m.content?.length || 0), 0)
    expect(totalHistoryChars).toBeLessThanOrEqual(40000)
  })
})

// ───────────────────────────────────────────
// 6. CHAT HISTORY ENDPOINTS
// ───────────────────────────────────────────
describe('getChatHistory', () => {
  it('returns messages in chronological order', async () => {
    const mockMessages = [
      { id: 'm1', role: 'user', content: 'Hi', tokens: null, cost: null, feedback: null, createdAt: new Date('2025-01-01') },
      { id: 'm2', role: 'assistant', content: 'Hello!', tokens: 20, cost: 0.001, feedback: null, createdAt: new Date('2025-01-02') },
    ]
    mockPrisma.chatMessage.findMany.mockResolvedValue(mockMessages as any)

    const req = { query: { limit: '50' }, user: { userId: 'user-1', organizationId: 'org-1' } } as any
    const res = mockRes()

    await getChatHistory(req, res)

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockMessages,
    })
    // Should order by createdAt desc and take the limit
    expect(mockPrisma.chatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', organizationId: 'org-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    )
  })

  it('caps limit at 200', async () => {
    mockPrisma.chatMessage.findMany.mockResolvedValue([])

    const req = { query: { limit: '500' }, user: { userId: 'user-1', organizationId: 'org-1' } } as any
    const res = mockRes()

    await getChatHistory(req, res)

    expect(mockPrisma.chatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    )
  })

  it('handles database errors', async () => {
    mockPrisma.chatMessage.findMany.mockRejectedValue(new Error('DB down'))

    const req = { query: {}, user: { userId: 'user-1', organizationId: 'org-1' } } as any
    const res = mockRes()

    await getChatHistory(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

describe('clearChatHistory', () => {
  it('deletes all user messages and returns count', async () => {
    mockPrisma.chatMessage.deleteMany.mockResolvedValue({ count: 15 })

    const req = { user: { userId: 'user-1', organizationId: 'org-1' } } as any
    const res = mockRes()

    await clearChatHistory(req, res)

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { deleted: 15 },
    })
    expect(mockPrisma.chatMessage.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', organizationId: 'org-1' },
    })
  })

  it('handles database errors', async () => {
    mockPrisma.chatMessage.deleteMany.mockRejectedValue(new Error('DB error'))

    const req = { user: { userId: 'user-1', organizationId: 'org-1' } } as any
    const res = mockRes()

    await clearChatHistory(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ───────────────────────────────────────────
// 7. ENHANCE MESSAGE
// ───────────────────────────────────────────
describe('enhanceMessage', () => {
  it('requires a message', async () => {
    const req = { body: {}, user: { userId: 'user-1', organizationId: 'org-1' } } as any
    const res = mockRes()

    await enhanceMessage(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns enhanced message on success', async () => {
    const req = { body: { message: 'Hey', type: 'email', tone: 'PROFESSIONAL' }, user: { userId: 'user-1', organizationId: 'org-1' } } as any
    const res = mockRes()

    await enhanceMessage(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    )
    expect(incrementAIUsage).toHaveBeenCalledWith('org-1', 'enhancements')
  })
})

// ───────────────────────────────────────────
// 8. SUGGEST ACTIONS
// ───────────────────────────────────────────
describe('suggestActions', () => {
  it('returns action suggestions', async () => {
    const req = { body: { context: 'new lead', leadId: 'lead-1' }, user: { userId: 'user-1', organizationId: 'org-1' } } as any
    const res = mockRes()

    await suggestActions(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    )
  })
})

// ───────────────────────────────────────────
// 9. FUNCTION DEFINITIONS INTEGRITY
// ───────────────────────────────────────────
describe('AI function definitions integrity', () => {
  // Import actual definitions for validation
  const {
    AI_FUNCTIONS,
    DESTRUCTIVE_FUNCTIONS,
    ADMIN_ONLY_FUNCTIONS,
    READ_ONLY_FUNCTIONS,
  } = jest.requireActual('../../src/services/ai-function-definitions')

  it('has 95 function definitions', () => {
    expect(AI_FUNCTIONS.length).toBe(95)
  })

  it('all functions have valid structure', () => {
    for (const fn of AI_FUNCTIONS) {
      expect(fn).toHaveProperty('name')
      expect(fn).toHaveProperty('description')
      expect(fn).toHaveProperty('parameters')
      expect(fn.parameters).toHaveProperty('type', 'object')
      expect(fn.parameters).toHaveProperty('properties')
      expect(typeof fn.name).toBe('string')
      expect(fn.name.length).toBeGreaterThan(0)
      expect(typeof fn.description).toBe('string')
      expect(fn.description.length).toBeGreaterThan(0)
    }
  })

  it('no duplicate function names', () => {
    const names = AI_FUNCTIONS.map((f: { name: string }) => f.name)
    const unique = new Set(names)
    expect(unique.size).toBe(names.length)
  })

  it('destructive functions are a subset of all functions', () => {
    const allNames = new Set(AI_FUNCTIONS.map((f: { name: string }) => f.name))
    for (const fn of DESTRUCTIVE_FUNCTIONS) {
      expect(allNames.has(fn)).toBe(true)
    }
  })

  it('admin-only functions are a subset of all functions', () => {
    const allNames = new Set(AI_FUNCTIONS.map((f: { name: string }) => f.name))
    for (const fn of ADMIN_ONLY_FUNCTIONS) {
      expect(allNames.has(fn)).toBe(true)
    }
  })

  it('read-only functions are a subset of all functions', () => {
    const allNames = new Set(AI_FUNCTIONS.map((f: { name: string }) => f.name))
    for (const fn of READ_ONLY_FUNCTIONS) {
      expect(allNames.has(fn)).toBe(true)
    }
  })

  it('destructive and read-only sets do not overlap', () => {
    for (const fn of READ_ONLY_FUNCTIONS) {
      expect(DESTRUCTIVE_FUNCTIONS.has(fn)).toBe(false)
    }
  })

  it('includes key function categories', () => {
    const names = AI_FUNCTIONS.map((f: { name: string }) => f.name)
    // Lead ops
    expect(names).toContain('create_lead')
    expect(names).toContain('search_leads')
    expect(names).toContain('get_lead_details')
    // Communication
    expect(names).toContain('send_email')
    expect(names).toContain('send_sms')
    expect(names).toContain('compose_email')
    // Campaigns
    expect(names).toContain('create_campaign')
    expect(names).toContain('list_campaigns')
    // Workflows
    expect(names).toContain('create_workflow')
    expect(names).toContain('list_workflows')
    // Tasks
    expect(names).toContain('create_task')
    expect(names).toContain('list_tasks')
    // Pipeline
    expect(names).toContain('get_pipelines')
    expect(names).toContain('create_pipeline')
    // Analytics
    expect(names).toContain('get_dashboard_stats')
    expect(names).toContain('get_lead_analytics')
    // Goals
    expect(names).toContain('create_goal')
    expect(names).toContain('list_goals')
    // Notifications
    expect(names).toContain('get_notifications')
    // Templates
    expect(names).toContain('create_email_template')
    expect(names).toContain('list_email_templates')
    // Export
    expect(names).toContain('export_data')
    // Settings
    expect(names).toContain('get_business_settings')
    expect(names).toContain('list_team_members')
  })
})

// ───────────────────────────────────────────
// 10. USAGE TRACKING
// ───────────────────────────────────────────
describe('chatWithAI – usage tracking', () => {
  it('tracks usage for regular chat', async () => {
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: 'Hello!',
      tokens: 100,
      cost: 0.003,
      functionCall: null,
    })

    const req = mockReq()
    const res = mockRes()
    await chatWithAI(req, res)

    expect(incrementAIUsage).toHaveBeenCalledWith('org-1', 'aiMessages', {
      tokens: 100,
      cost: 0.003,
    })
  })

  it('tracks combined usage for function-call chat', async () => {
    mockOpenAI.chatWithFunctions.mockResolvedValue({
      response: null,
      tokens: 80,
      cost: 0.002,
      functionCall: { name: 'get_lead_count', arguments: {} },
    })
    mockExecuteFunction.mockResolvedValue(JSON.stringify({ count: 5 }))
    mockOpenAI.chat.mockResolvedValue({
      response: 'You have 5 leads.',
      tokens: 30,
      cost: 0.001,
    })

    const req = mockReq({ message: 'How many leads?' })
    const res = mockRes()
    await chatWithAI(req, res)

    expect(incrementAIUsage).toHaveBeenCalledWith('org-1', 'aiMessages', {
      tokens: 110,
      cost: 0.003,
    })
  })
})
