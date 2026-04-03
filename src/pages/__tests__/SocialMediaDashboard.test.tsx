import { renderWithProviders } from './test-utils'

import SocialMediaDashboard from '@/pages/communication/SocialMediaDashboard'

describe('SocialMediaDashboard', () => {
  it('renders without crashing', () => {
    renderWithProviders(<SocialMediaDashboard />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
