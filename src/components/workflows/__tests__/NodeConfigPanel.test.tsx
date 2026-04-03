import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('dompurify', () => ({
  default: { sanitize: (s: string) => s },
}))

import { NodeConfigPanel } from '../NodeConfigPanel'

describe('NodeConfigPanel', () => {
  it('renders without crashing', () => {
    const node = {
      id: 'node-1',
      type: 'trigger' as const,
      label: 'Test Trigger',
      config: {},
    }
    render(
      <NodeConfigPanel
        node={node}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
