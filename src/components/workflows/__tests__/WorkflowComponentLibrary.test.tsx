import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { WorkflowComponentLibrary } from '../WorkflowComponentLibrary'

describe('WorkflowComponentLibrary', () => {
  it('renders without crashing', () => {
    render(
      <WorkflowComponentLibrary
        onComponentSelect={vi.fn()}
        onComponentDragStart={vi.fn()}
        mode="click"
      />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
