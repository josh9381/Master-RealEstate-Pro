import { render, screen } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Card className="my-class">Content</Card>)
    expect(screen.getByText('Content')).toHaveClass('my-class')
  })

  it('forwards ref', () => {
    const ref = { current: null }
    render(<Card ref={ref}>Ref</Card>)
    expect(ref.current).not.toBeNull()
  })
})

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header</CardHeader>)
    expect(screen.getByText('Header')).toBeInTheDocument()
  })
})

describe('CardTitle', () => {
  it('renders as h3', () => {
    render(<CardTitle>My Title</CardTitle>)
    const el = screen.getByText('My Title')
    expect(el.tagName).toBe('H3')
  })
})

describe('CardDescription', () => {
  it('renders description text', () => {
    render(<CardDescription>A description</CardDescription>)
    expect(screen.getByText('A description')).toBeInTheDocument()
  })
})

describe('CardContent', () => {
  it('renders content', () => {
    render(<CardContent>Body text</CardContent>)
    expect(screen.getByText('Body text')).toBeInTheDocument()
  })
})

describe('CardFooter', () => {
  it('renders footer', () => {
    render(<CardFooter>Footer text</CardFooter>)
    expect(screen.getByText('Footer text')).toBeInTheDocument()
  })
})

describe('Card composition', () => {
  it('renders full card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Desc')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })
})
