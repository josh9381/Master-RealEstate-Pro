import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkflowNode, WorkflowNodeData } from '../WorkflowNode'

describe('WorkflowNode', () => {
  const mockNode: WorkflowNodeData = {
    id: 'node-1',
    type: 'action',
    label: 'Send Email',
    description: 'Send welcome email to lead',
    config: { actionType: 'SEND_EMAIL' },
  }

  it('renders node label', () => {
    render(<WorkflowNode node={mockNode} />)
    expect(screen.getByText('Send Email')).toBeInTheDocument()
  })

  it('renders node description', () => {
    render(<WorkflowNode node={mockNode} />)
    expect(screen.getByText('Send welcome email to lead')).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(<WorkflowNode node={mockNode} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Send Email'))
    expect(onSelect).toHaveBeenCalledWith(mockNode)
  })

  it('renders trigger node', () => {
    const triggerNode: WorkflowNodeData = {
      id: 'trigger-1',
      type: 'trigger',
      label: 'Lead Created',
    }
    render(<WorkflowNode node={triggerNode} />)
    expect(screen.getByText('Lead Created')).toBeInTheDocument()
  })

  it('renders condition node', () => {
    const conditionNode: WorkflowNodeData = {
      id: 'cond-1',
      type: 'condition',
      label: 'Score > 50',
    }
    render(<WorkflowNode node={conditionNode} />)
    expect(screen.getByText('Score > 50')).toBeInTheDocument()
  })

  it('renders delay node', () => {
    const delayNode: WorkflowNodeData = {
      id: 'delay-1',
      type: 'delay',
      label: 'Wait 3 days',
    }
    render(<WorkflowNode node={delayNode} />)
    expect(screen.getByText('Wait 3 days')).toBeInTheDocument()
  })
})
