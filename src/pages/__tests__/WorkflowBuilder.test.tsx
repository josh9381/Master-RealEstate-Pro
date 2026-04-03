/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useParams: () => ({ id: '1' }), useNavigate: () => vi.fn() }
})

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))

vi.mock('@/lib/api', () => ({
  workflowsApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    getById: vi.fn().mockResolvedValue({ data: { id: '1', name: 'Test Workflow', nodes: [], edges: [] } }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

vi.mock('@/components/workflows/WorkflowCanvas', () => ({
  WorkflowCanvas: () => <div data-testid="workflow-canvas" />,
}))

vi.mock('@/components/workflows/WorkflowComponentLibrary', () => ({
  WorkflowComponentLibrary: () => <div />,
}))

vi.mock('@/components/workflows/NodeConfigPanel', () => ({
  NodeConfigPanel: () => <div />,
}))

vi.mock('@/components/ModalErrorBoundary', () => ({
  ModalErrorBoundary: ({ children }: any) => <div>{children}</div>,
}))

import WorkflowBuilder from '@/pages/workflows/WorkflowBuilder'

describe('WorkflowBuilder', () => {
  it('renders without crashing', () => {
    renderWithProviders(<WorkflowBuilder />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
