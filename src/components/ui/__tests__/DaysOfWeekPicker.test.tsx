import { render, screen, fireEvent } from '@testing-library/react'
import { DaysOfWeekPicker } from '../DaysOfWeekPicker'

describe('DaysOfWeekPicker', () => {
  it('renders 7 day buttons', () => {
    render(<DaysOfWeekPicker />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(7)
  })

  it('renders day labels in aria-label', () => {
    render(<DaysOfWeekPicker />)
    expect(screen.getByRole('button', { name: 'Mon' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sun' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sat' })).toBeInTheDocument()
  })

  it('marks pre-selected days with aria-pressed=true', () => {
    render(<DaysOfWeekPicker value={[1, 3]} />)
    const mon = screen.getByRole('button', { name: 'Mon' })
    const wed = screen.getByRole('button', { name: 'Wed' })
    const tue = screen.getByRole('button', { name: 'Tue' })
    expect(mon).toHaveAttribute('aria-pressed', 'true')
    expect(wed).toHaveAttribute('aria-pressed', 'true')
    expect(tue).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange when a day is clicked', () => {
    const onChange = vi.fn()
    render(<DaysOfWeekPicker onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mon' }))
    expect(onChange).toHaveBeenCalledWith([1])
  })

  it('toggles day selection on repeated clicks', () => {
    const onChange = vi.fn()
    render(<DaysOfWeekPicker onChange={onChange} />)
    const monBtn = screen.getByRole('button', { name: 'Mon' })
    fireEvent.click(monBtn)
    expect(onChange).toHaveBeenLastCalledWith([1])
    fireEvent.click(monBtn)
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('does not fire onChange when disabled', () => {
    const onChange = vi.fn()
    render(<DaysOfWeekPicker disabled onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mon' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('disables all buttons when disabled=true', () => {
    render(<DaysOfWeekPicker disabled />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => expect(btn).toBeDisabled())
  })

  it('sorts selected days numerically', () => {
    const onChange = vi.fn()
    render(<DaysOfWeekPicker value={[3]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mon' }))
    expect(onChange).toHaveBeenLastCalledWith([1, 3])
  })
})
