import { render, screen } from '@testing-library/react'
import { PasswordStrengthIndicator } from '../PasswordStrengthIndicator'

describe('PasswordStrengthIndicator', () => {
  it('renders nothing when password is empty', () => {
    const { container } = render(<PasswordStrengthIndicator password="" />)
    expect(container.firstChild).toBeNull()
  })

  it('shows "Weak" for a short simple password', () => {
    render(<PasswordStrengthIndicator password="abc" />)
    expect(screen.getByText('Weak')).toBeInTheDocument()
  })

  it('shows "Strong" for a complex password', () => {
    render(<PasswordStrengthIndicator password="MyP@ss1!" />)
    expect(screen.getByText('Strong')).toBeInTheDocument()
  })

  it('shows "Very Strong" for a very complex password', () => {
    render(<PasswordStrengthIndicator password="MyP@ssword1!" />)
    expect(screen.getByText('Very Strong')).toBeInTheDocument()
  })

  it('displays requirements checklist by default', () => {
    render(<PasswordStrengthIndicator password="test" />)
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument()
    expect(screen.getByText('Contains uppercase letter')).toBeInTheDocument()
    expect(screen.getByText('Contains lowercase letter')).toBeInTheDocument()
    expect(screen.getByText('Contains a number')).toBeInTheDocument()
    expect(screen.getByText('Contains special character')).toBeInTheDocument()
  })

  it('hides requirements when showRequirements=false', () => {
    render(<PasswordStrengthIndicator password="test" showRequirements={false} />)
    expect(screen.queryByText('At least 8 characters')).not.toBeInTheDocument()
  })

  it('shows strength label text', () => {
    render(<PasswordStrengthIndicator password="test123" />)
    expect(screen.getByText('Password strength')).toBeInTheDocument()
  })
})
