/* eslint-disable @typescript-eslint/no-explicit-any */
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../WorkflowNode', () => ({
  WorkflowNode: ({ node }: any) => <div data-testid={`node-${node.id}`}>{node.label}</div>,
}))

import { WorkflowCanvas } from '../WorkflowCanvas'

describe('WorkflowCanvas', () => {
  it('renders without crashing', () => {
    render(
      <WorkflowCanvas
        nodes={[]}
        onNodeSelect={vi.fn()}
        onNodeDelete={vi.fn()}
        onNodeEdit={vi.fn()}
      />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
