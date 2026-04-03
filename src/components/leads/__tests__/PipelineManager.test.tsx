import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  pipelinesApi: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    createStage: vi.fn(),
    updateStage: vi.fn(),
    deleteStage: vi.fn(),
    reorderStages: vi.fn(),
  },
}))

vi.mock('@/lib/chartColors', () => ({
  PIPELINE_STAGE_COLORS: ['#6B7280', '#3B82F6', '#22C55E'],
}))

import { PipelineManager } from '../PipelineManager'

describe('PipelineManager', () => {
  it('renders without crashing', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <PipelineManager pipelines={[]} onClose={vi.fn()} />
      </QueryClientProvider>
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
