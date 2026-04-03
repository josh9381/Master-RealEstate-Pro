import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/lib/api', () => ({
  authApi: { verifyEmail: vi.fn().mockResolvedValue({}) },
}))

import VerifyEmail from '@/pages/auth/VerifyEmail'

describe('VerifyEmail', () => {
  it('renders without crashing', () => {
    render(<MemoryRouter initialEntries={['?token=abc123']}><VerifyEmail /></MemoryRouter>)
    // Should render some UI about email verification
    expect(document.body.textContent).toBeTruthy()
  })
})
