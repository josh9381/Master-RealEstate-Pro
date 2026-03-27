import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBanner } from '../ErrorBanner'

describe('ErrorBanner', () => {
  it('renders the error message', () => {
    render(<ErrorBanner message="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders with role="alert"', () => {
    render(<ErrorBanner message="Error" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows retry button when retry prop is provided', () => {
    const retry = vi.fn()
    render(<ErrorBanner message="Error" retry={retry} />)
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('calls retry when retry button is clicked', () => {
    const retry = vi.fn()
    render(<ErrorBanner message="Error" retry={retry} />)
    fireEvent.click(screen.getByText('Retry'))
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('does not show retry button when retry prop is absent', () => {
    render(<ErrorBanner message="Error" />)
    expect(screen.queryByText('Retry')).not.toBeInTheDocument()
  })

  it('shows dismiss button when dismissible=true (default)', () => {
    render(<ErrorBanner message="Error" />)
    expect(screen.getByLabelText('Dismiss')).toBeInTheDocument()
  })

  it('hides dismiss button when dismissible=false', () => {
    render(<ErrorBanner message="Error" dismissible={false} />)
    expect(screen.queryByLabelText('Dismiss')).not.toBeInTheDocument()
  })

  it('dismisses the banner when dismiss button is clicked', () => {
    render(<ErrorBanner message="Error" />)
    fireEvent.click(screen.getByLabelText('Dismiss'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<ErrorBanner message="Error" className="my-class" />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('my-class')
  })
})
