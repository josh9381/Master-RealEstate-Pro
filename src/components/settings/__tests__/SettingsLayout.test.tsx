import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { SettingsLayout } from '../SettingsLayout'

describe('SettingsLayout', () => {
  it('renders settings navigation', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <SettingsLayout><div>Test child</div></SettingsLayout>
      </MemoryRouter>
    )
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders search input', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <SettingsLayout><div>Test child</div></SettingsLayout>
      </MemoryRouter>
    )
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })
})
