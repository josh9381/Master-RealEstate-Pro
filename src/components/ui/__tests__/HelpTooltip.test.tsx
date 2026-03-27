import { render, screen, fireEvent } from '@testing-library/react'
import { HelpTooltip } from '../HelpTooltip'

describe('HelpTooltip', () => {
  it('renders a help button', () => {
    render(<HelpTooltip text="This is help text" />)
    expect(screen.getByRole('button', { name: /help/i })).toBeInTheDocument()
  })

  it('does not show tooltip text initially', () => {
    render(<HelpTooltip text="Help content here" />)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('shows tooltip text on mouse enter', () => {
    render(<HelpTooltip text="Help content here" />)
    const button = screen.getByRole('button', { name: /help/i })
    fireEvent.mouseEnter(button)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByText('Help content here')).toBeInTheDocument()
  })

  it('hides tooltip on mouse leave', () => {
    render(<HelpTooltip text="Help content" />)
    const button = screen.getByRole('button', { name: /help/i })
    fireEvent.mouseEnter(button)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.mouseLeave(button)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('toggles tooltip on click', () => {
    render(<HelpTooltip text="Clickable help" />)
    const button = screen.getByRole('button', { name: /help/i })
    fireEvent.click(button)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.click(button)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
