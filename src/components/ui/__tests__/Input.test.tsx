import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/Input'

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('accepts and displays text input', async () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'Hello World')
    expect(input).toHaveValue('Hello World')
  })

  it('renders as disabled', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('renders with correct type', () => {
    render(<Input type="email" data-testid="email-input" />)
    expect(screen.getByTestId('email-input')).toHaveAttribute('type', 'email')
  })

  it('applies custom className', () => {
    render(<Input className="my-class" />)
    expect(screen.getByRole('textbox')).toHaveClass('my-class')
  })

  it('fires onChange handler', async () => {
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'a')
    expect(onChange).toHaveBeenCalled()
  })

  it('forwards ref', () => {
    const ref = vi.fn()
    render(<Input ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('has proper base styling classes', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('rounded-md', 'border')
  })
})
