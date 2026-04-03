import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from '@/components/ui/Textarea'

describe('Textarea', () => {
  it('renders a textarea element', () => {
    render(<Textarea placeholder="Enter notes" />)
    expect(screen.getByPlaceholderText('Enter notes')).toBeInTheDocument()
  })

  it('accepts text input', async () => {
    render(<Textarea />)
    const textarea = screen.getByRole('textbox')
    await userEvent.type(textarea, 'Hello World')
    expect(textarea).toHaveValue('Hello World')
  })

  it('renders as disabled', () => {
    render(<Textarea disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})
