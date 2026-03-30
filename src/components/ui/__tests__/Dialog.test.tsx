import { render, screen, fireEvent } from '@testing-library/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../Dialog'

describe('Dialog', () => {
  it('renders nothing when open=false', () => {
    render(
      <Dialog open={false} onOpenChange={vi.fn()}>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <p>Content</p>
        </DialogContent>
      </Dialog>
    )
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders content when open=true', () => {
    render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <DialogContent>
          <DialogTitle>My Dialog</DialogTitle>
          <p>Dialog body</p>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Dialog body')).toBeInTheDocument()
  })

  it('renders with role="dialog"', () => {
    render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when Escape is pressed', async () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders DialogHeader, DialogTitle, DialogDescription, DialogFooter', () => {
    render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Header Title</DialogTitle>
            <DialogDescription>A description</DialogDescription>
          </DialogHeader>
          <DialogFooter>Footer content</DialogFooter>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Header Title')).toBeInTheDocument()
    expect(screen.getByText('A description')).toBeInTheDocument()
    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })

  it('DialogTitle renders as h2', () => {
    render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <DialogContent>
          <DialogTitle>Test Heading</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    const heading = screen.getByText('Test Heading')
    expect(heading.tagName).toBe('H2')
  })
})
