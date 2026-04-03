import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import TermsOfService from '@/pages/auth/TermsOfService'

describe('TermsOfService', () => {
  it('renders Terms of Service heading', () => {
    render(<MemoryRouter><TermsOfService /></MemoryRouter>)
    expect(screen.getByText('Terms of Service')).toBeInTheDocument()
  })

  it('renders section headings', () => {
    render(<MemoryRouter><TermsOfService /></MemoryRouter>)
    expect(screen.getByText(/acceptance of terms/i)).toBeInTheDocument()
    expect(screen.getByText(/description of service/i)).toBeInTheDocument()
  })

  it('renders back to register link', () => {
    render(<MemoryRouter><TermsOfService /></MemoryRouter>)
    expect(screen.getByText(/back to register/i)).toBeInTheDocument()
  })
})
