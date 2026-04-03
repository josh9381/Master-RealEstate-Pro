import { screen } from '@testing-library/react'
import { renderWithProviders } from './test-utils'

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }),
}))
vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}))
vi.mock('@/lib/api', () => ({
  tasksApi: {
    list: vi.fn().mockResolvedValue({ tasks: [], total: 0, totalPages: 0 }),
    getStats: vi.fn().mockResolvedValue({ total: 0, pending: 0, completed: 0, overdue: 0 }),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  usersApi: { listTeam: vi.fn().mockResolvedValue({ users: [] }) },
}))

import TasksPage from '@/pages/tasks/TasksPage'

describe('TasksPage', () => {
  it('renders tasks heading', () => {
    renderWithProviders(<TasksPage />)
    expect(screen.getByText('Tasks')).toBeInTheDocument()
  })
})
