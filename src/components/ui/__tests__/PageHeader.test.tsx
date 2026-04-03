import { render, screen } from '@testing-library/react'
import { PageHeader } from '@/components/ui/PageHeader'

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Dashboard" />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Dashboard" subtitle="Overview of your data" />)
    expect(screen.getByText('Overview of your data')).toBeInTheDocument()
  })

  it('renders actions when provided', () => {
    render(<PageHeader title="Dashboard" actions={<button>Add New</button>} />)
    expect(screen.getByRole('button', { name: 'Add New' })).toBeInTheDocument()
  })
})
