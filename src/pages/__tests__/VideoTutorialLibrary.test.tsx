import { renderWithProviders } from './test-utils'

vi.mock('@/components/shared/ComingSoon', () => ({
  ComingSoon: () => <div>Coming Soon</div>,
}))

import VideoTutorialLibrary from '@/pages/help/VideoTutorialLibrary'

describe('VideoTutorialLibrary', () => {
  it('renders without crashing', () => {
    renderWithProviders(<VideoTutorialLibrary />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
