/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen } from '@testing-library/react'
import { renderWithProviders } from './test-utils'

vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    () => ({ user: { id: '1', role: 'admin' }, isAdmin: () => true, isManager: () => true }),
    { getState: () => ({ user: { id: '1', role: 'admin' }, isAdmin: () => true, isManager: () => true }) }
  ),
}))
vi.mock('@/components/auth/RoleBasedLayout', () => ({
  RoleBasedSection: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('@/components/admin/OrganizationHeader', () => ({
  OrganizationHeader: () => <div>Org Header</div>,
}))
vi.mock('@/components/admin/AdminStats', () => ({
  AdminStats: () => <div>Admin Stats</div>,
}))
vi.mock('@/components/admin/ActivityLog', () => ({
  ActivityLog: () => <div>Activity Log</div>,
}))
vi.mock('@/components/admin/SubscriptionStatus', () => ({
  SubscriptionStatus: () => <div>Sub Status</div>,
}))
vi.mock('@/components/admin/AICostWidget', () => ({
  AICostWidget: () => <div>AI Cost</div>,
}))

import AdminPanel from '@/pages/admin/AdminPanel'

describe('AdminPanel', () => {
  it('renders admin panel heading', () => {
    renderWithProviders(<AdminPanel />)
    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
  })
})
