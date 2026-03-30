import { render } from '@testing-library/react'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'

describe('LoadingSkeleton', () => {
  it('renders 4 stat cards', () => {
    const { container } = render(<LoadingSkeleton />)
    // 4 stat cards in grid
    const grid = container.querySelector('.grid')
    expect(grid?.children.length).toBe(4)
  })

  it('renders default 3 list rows', () => {
    const { container } = render(<LoadingSkeleton />)
    // Last card has list rows
    const listItems = container.querySelectorAll('.flex.items-center.space-x-4')
    expect(listItems.length).toBe(3)
  })

  it('renders custom rows count', () => {
    const { container } = render(<LoadingSkeleton rows={5} />)
    const listItems = container.querySelectorAll('.flex.items-center.space-x-4')
    expect(listItems.length).toBe(5)
  })

  it('does not render chart placeholder by default', () => {
    const { container } = render(<LoadingSkeleton />)
    // Chart placeholder has a h-64 div
    const chartDiv = container.querySelector('.h-64')
    expect(chartDiv).toBeNull()
  })

  it('renders chart placeholder when showChart=true', () => {
    const { container } = render(<LoadingSkeleton showChart />)
    const chartDiv = container.querySelector('.h-64')
    expect(chartDiv).not.toBeNull()
  })

  it('has animate-pulse class for skeleton animation', () => {
    const { container } = render(<LoadingSkeleton />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })
})
