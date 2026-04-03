import { render, screen } from '@testing-library/react'
import { Select } from '@/components/ui/Select'

describe('Select', () => {
  it('renders a select element with options', () => {
    render(
      <Select aria-label="Choose option">
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select>
    )
    const select = screen.getByRole('combobox', { name: 'Choose option' })
    expect(select).toBeInTheDocument()
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
  })

  it('renders as disabled', () => {
    render(
      <Select disabled aria-label="Choose option">
        <option>A</option>
      </Select>
    )
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
