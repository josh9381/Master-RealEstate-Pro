import { render, screen } from '@testing-library/react'
import { ChartErrorBoundary } from '@/components/shared/ChartErrorBoundary'

describe('ChartErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ChartErrorBoundary>
        <p>Chart content</p>
      </ChartErrorBoundary>
    )
    expect(screen.getByText('Chart content')).toBeInTheDocument()
  })

  it('renders error fallback when child throws', () => {
    const ThrowingChild = () => {
      throw new Error('render error')
    }
    // Suppress console.error for the expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ChartErrorBoundary chartName="Revenue">
        <ThrowingChild />
      </ChartErrorBoundary>
    )
    expect(screen.getByText('Unable to render Revenue chart')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
    spy.mockRestore()
  })
})
