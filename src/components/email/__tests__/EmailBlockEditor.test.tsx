import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }))
vi.mock('dompurify', () => ({
  default: { sanitize: (x: string) => x },
}))
vi.mock('@/lib/api', () => ({
  campaignsApi: { saveTemplate: vi.fn() },
}))

import { EmailBlockEditor } from '../EmailBlockEditor'

describe('EmailBlockEditor', () => {
  it('renders without crashing', () => {
    render(<EmailBlockEditor value="" onChange={vi.fn()} />)
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
