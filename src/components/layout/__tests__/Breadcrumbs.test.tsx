import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

function renderWithPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Breadcrumbs />
    </MemoryRouter>
  )
}

describe('Breadcrumbs', () => {
  it('renders nothing for / path', () => {
    const { container } = renderWithPath('/')
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for /dashboard', () => {
    const { container } = renderWithPath('/dashboard')
    expect(container.firstChild).toBeNull()
  })

  it('renders breadcrumb nav for /leads', () => {
    renderWithPath('/leads')
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    expect(screen.getByText('Leads')).toBeInTheDocument()
  })

  it('renders home icon', () => {
    renderWithPath('/leads')
    const homeLink = screen.getByRole('link', { name: 'Home' })
    expect(homeLink).toBeInTheDocument()
  })

  it('renders nested path segments', () => {
    renderWithPath('/campaigns/templates')
    expect(screen.getByText('Campaigns')).toBeInTheDocument()
    expect(screen.getByText('Templates')).toBeInTheDocument()
  })

  it('capitalizes unknown path segments', () => {
    renderWithPath('/some-unknown-page')
    expect(screen.getByText('Some Unknown Page')).toBeInTheDocument()
  })

  it('shows Detail for ID-like segments', () => {
    renderWithPath('/leads/550e8400-e29b-41d4-a716-446655440000')
    expect(screen.getByText('Detail')).toBeInTheDocument()
  })

  it('collapses middle items at 4+ depth with ellipsis', () => {
    renderWithPath('/a/b/c/d')
    expect(screen.getByText('…')).toBeInTheDocument()
  })

  it('last breadcrumb item is not a link (current page)', () => {
    renderWithPath('/leads')
    const leadsText = screen.getByText('Leads')
    expect(leadsText.tagName).not.toBe('A')
  })
})
