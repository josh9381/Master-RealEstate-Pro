import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs } from '@/components/ui/Tabs'

const tabs = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active', count: 3 },
  { value: 'archived', label: 'Archived' },
]

describe('Tabs', () => {
  it('renders all tabs', () => {
    render(<Tabs tabs={tabs} value="all" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: /All/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Active/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Archived/ })).toBeInTheDocument()
  })

  it('marks the active tab as selected', () => {
    render(<Tabs tabs={tabs} value="active" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: /Active/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /All/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onChange when a tab is clicked', async () => {
    const onChange = vi.fn()
    render(<Tabs tabs={tabs} value="all" onChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: /Archived/ }))
    expect(onChange).toHaveBeenCalledWith('archived')
  })

  it('displays count badge', () => {
    render(<Tabs tabs={tabs} value="all" onChange={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
