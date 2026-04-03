import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateRangePicker } from '@/components/shared/DateRangePicker'

describe('DateRangePicker', () => {
  it('renders with preset options', () => {
    render(<DateRangePicker onChange={vi.fn()} />)
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
    expect(screen.getByText('Last 90 days')).toBeInTheDocument()
    expect(screen.getByText('Last year')).toBeInTheDocument()
  })

  it('calls onChange when preset is selected', async () => {
    const onChange = vi.fn()
    render(<DateRangePicker onChange={onChange} />)
    const select = screen.getByRole('combobox')
    await userEvent.selectOptions(select, '7d')
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: expect.any(String), endDate: expect.any(String) }),
      '7d'
    )
  })

  it('defaults to 30d preset', () => {
    render(<DateRangePicker onChange={vi.fn()} />)
    const select = screen.getByRole('combobox')
    expect(select).toHaveValue('30d')
  })
})
