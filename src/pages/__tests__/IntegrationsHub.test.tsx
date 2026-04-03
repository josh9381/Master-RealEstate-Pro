import { screen } from '@testing-library/react'
import { renderWithProviders } from './test-utils'

vi.mock('@/lib/api', () => ({
  settingsApi: {
    getIntegrationStatus: vi.fn().mockResolvedValue({ integrations: [] }),
  },
}))

import IntegrationsHub from '@/pages/integrations/IntegrationsHub'

describe('IntegrationsHub', () => {
  it('renders integrations heading', () => {
    renderWithProviders(<IntegrationsHub />)
    expect(screen.getByText('Integrations')).toBeInTheDocument()
  })
})
