import { render, screen } from '@testing-library/react'
import { Label } from '../Label'

describe('Label', () => {
  it('renders label text', () => {
    render(<Label>First Name</Label>)
    expect(screen.getByText('First Name')).toBeInTheDocument()
  })

  it('renders as label element', () => {
    render(<Label>Email</Label>)
    const el = screen.getByText('Email')
    expect(el.tagName).toBe('LABEL')
  })

  it('associates with input via htmlFor', () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>
    )
    const label = screen.getByText('Email')
    expect(label).toHaveAttribute('for', 'email')
  })

  it('applies custom className', () => {
    render(<Label className="custom-label">Name</Label>)
    const label = screen.getByText('Name')
    expect(label).toHaveClass('custom-label')
  })

  it('forwards ref', () => {
    const ref = { current: null }
    render(<Label ref={ref}>Ref Label</Label>)
    expect(ref.current).not.toBeNull()
  })

  it('passes through HTML attributes', () => {
    render(<Label data-testid="my-label">Test</Label>)
    expect(screen.getByTestId('my-label')).toBeInTheDocument()
  })
})
