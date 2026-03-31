import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock the api module
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
  createABTest,
  getABTests,
  getABTest,
  getABTestResults,
  startABTest,
  pauseABTest,
  stopABTest,
  deleteABTest,
  recordABTestInteraction,
} from '../abtestService'

describe('abtestService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createABTest posts to /ab-tests', async () => {
    mockPost.mockResolvedValue({ data: { data: { id: 'test1', name: 'Test' } } })
    const result = await createABTest({
      name: 'Test',
      type: 'EMAIL_SUBJECT',
      variantA: { subject: 'A' },
      variantB: { subject: 'B' },
    })
    expect(mockPost).toHaveBeenCalledWith('/ab-tests', expect.any(Object))
    expect(result).toHaveProperty('id')
  })

  it('getABTests fetches from /ab-tests', async () => {
    mockGet.mockResolvedValue({ data: { data: [{ id: 'test1' }] } })
    const result = await getABTests()
    expect(mockGet).toHaveBeenCalledWith('/ab-tests')
    expect(Array.isArray(result)).toBe(true)
  })

  it('getABTest fetches single test by ID', async () => {
    mockGet.mockResolvedValue({ data: { data: { id: 'test1' } } })
    const result = await getABTest('test1')
    expect(mockGet).toHaveBeenCalledWith('/ab-tests/test1')
    expect(result.id).toBe('test1')
  })

  it('getABTestResults fetches results with analysis', async () => {
    mockGet.mockResolvedValue({
      data: {
        data: {
          results: { variantA: {}, variantB: {} },
          analysis: { isSignificant: true, winner: 'A' },
        },
      },
    })
    const result = await getABTestResults('test1')
    expect(mockGet).toHaveBeenCalledWith('/ab-tests/test1/results')
    expect(result).toHaveProperty('results')
    expect(result).toHaveProperty('analysis')
  })

  it('startABTest posts to start endpoint', async () => {
    mockPost.mockResolvedValue({ data: { data: { id: 'test1', status: 'RUNNING' } } })
    const result = await startABTest('test1')
    expect(mockPost).toHaveBeenCalledWith('/ab-tests/test1/start')
    expect(result.status).toBe('RUNNING')
  })

  it('pauseABTest posts to pause endpoint', async () => {
    mockPost.mockResolvedValue({ data: { data: { id: 'test1', status: 'PAUSED' } } })
    await pauseABTest('test1')
    expect(mockPost).toHaveBeenCalledWith('/ab-tests/test1/pause')
  })

  it('stopABTest posts to stop endpoint', async () => {
    mockPost.mockResolvedValue({ data: { data: { id: 'test1', status: 'COMPLETED' } } })
    await stopABTest('test1')
    expect(mockPost).toHaveBeenCalledWith('/ab-tests/test1/stop')
  })

  it('deleteABTest calls delete', async () => {
    mockDelete.mockResolvedValue({ data: {} })
    await deleteABTest('test1')
    expect(mockDelete).toHaveBeenCalledWith('/ab-tests/test1')
  })

  it('recordABTestInteraction posts interaction', async () => {
    mockPost.mockResolvedValue({ data: {} })
    await recordABTestInteraction('test1', 'result1', 'click')
    expect(mockPost).toHaveBeenCalledWith('/ab-tests/test1/interaction', {
      resultId: 'result1',
      type: 'click',
    })
  })
})
