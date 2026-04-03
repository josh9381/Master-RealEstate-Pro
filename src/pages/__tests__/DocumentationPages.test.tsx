import { renderWithProviders } from './test-utils'

vi.mock('@/lib/api', () => ({
  docsApi: {
    getCategories: vi.fn().mockResolvedValue({ data: [] }),
    getArticles: vi.fn().mockResolvedValue({ data: [] }),
    getArticle: vi.fn().mockResolvedValue({ data: null }),
    search: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

import DocumentationPages from '@/pages/help/DocumentationPages'

describe('DocumentationPages', () => {
  it('renders without crashing', () => {
    renderWithProviders(<DocumentationPages />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
