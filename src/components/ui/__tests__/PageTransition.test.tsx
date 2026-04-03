import { render, screen } from '@testing-library/react'
import { PageTransition } from '@/components/ui/PageTransition'

describe('PageTransition', () => {
  it('renders children', () => {
    render(<PageTransition><p>Hello World</p></PageTransition>)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})
