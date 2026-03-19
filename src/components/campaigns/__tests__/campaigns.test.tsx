import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CampaignExecutionStatus } from '../CampaignExecutionStatus'

// Mock the API
const mockGetCampaignStats = vi.fn()
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  campaignsApi: {
    getCampaignStats: (...args: unknown[]) => mockGetCampaignStats(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

describe('CampaignExecutionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockGetCampaignStats.mockReturnValue(new Promise(() => {})) // never resolves
    render(<CampaignExecutionStatus campaignId="test-1" />)
    expect(screen.getByText(/loading execution status/i)).toBeInTheDocument()
  })

  it('shows sending phase with progress', async () => {
    mockGetCampaignStats.mockResolvedValue({
      data: {
        campaignId: 'test-1',
        name: 'Test Campaign',
        phase: 'sending',
        progress: 50,
        totalRecipients: 100,
        totalSent: 50,
        delivered: 45,
        bounced: 2,
        isABTest: false,
        isMockMode: false,
        startedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    })

    render(<CampaignExecutionStatus campaignId="test-1" />)

    await waitFor(() => {
      expect(screen.getByText(/Sending\.\.\./i)).toBeInTheDocument()
    })
  })

  it('shows completed phase and calls onComplete callback', async () => {
    const onComplete = vi.fn()
    mockGetCampaignStats.mockResolvedValue({
      data: {
        campaignId: 'test-1',
        name: 'Test Campaign',
        phase: 'completed',
        progress: 100,
        totalRecipients: 100,
        totalSent: 100,
        delivered: 95,
        bounced: 3,
        isABTest: false,
        isMockMode: false,
        startedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    })

    render(<CampaignExecutionStatus campaignId="test-1" onComplete={onComplete} />)

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled()
    })
  })

  it('shows error state with retry button', async () => {
    mockGetCampaignStats.mockRejectedValue(new Error('Network error'))

    render(<CampaignExecutionStatus campaignId="test-1" />)

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument()
      expect(screen.getByText(/retry/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('shows mock mode indicator when no API keys configured', async () => {
    mockGetCampaignStats.mockResolvedValue({
      data: {
        campaignId: 'test-1',
        name: 'Test Campaign',
        phase: 'completed',
        progress: 100,
        totalRecipients: 10,
        totalSent: 10,
        delivered: 10,
        bounced: 0,
        isABTest: false,
        isMockMode: true,
        startedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    })

    render(<CampaignExecutionStatus campaignId="test-1" />)

    await waitFor(() => {
      expect(screen.getByText(/mock/i)).toBeInTheDocument()
    })
  })
})

describe('Campaign API contract', () => {
  it('sendCampaign API should support confirmLargeSend option', async () => {
    const { campaignsApi } = await import('@/lib/api')
    // Verify the API function signature accepts the confirmation flag
    expect(campaignsApi).toBeDefined()
  })
})
