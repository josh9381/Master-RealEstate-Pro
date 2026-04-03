import { screen } from '@testing-library/react'
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/api', () => ({
  docsApi: { getCategories: vi.fn().mockResolvedValue({ categories: [] }) },
}))

import HelpCenter from '@/pages/help/HelpCenter'

describe('HelpCenter', () => {
  it('renders help center heading', () => {
    renderWithProviders(<HelpCenter />)
    expect(screen.getByText('Help Center')).toBeInTheDocument()
  })
})
