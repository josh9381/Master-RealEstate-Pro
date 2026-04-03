import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { success: true, message: 'Unsubscribed', lead: { id: '1', email: 'test@test.com', firstName: 'Test', lastName: 'User', emailOptIn: false, emailOptOutAt: null, emailOptOutReason: null } } }),
    post: vi.fn().mockResolvedValue({ data: { success: true, message: 'Unsubscribed' } }),
  },
}))

import { UnsubscribePage } from '@/pages/unsubscribe/UnsubscribePage'

describe('UnsubscribePage', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter initialEntries={['/unsubscribe/token123']}>
        <Routes>
          <Route path="/unsubscribe/:token" element={<UnsubscribePage />} />
        </Routes>
      </MemoryRouter>
    )
    expect(document.body.textContent).toBeTruthy()
  })
})
