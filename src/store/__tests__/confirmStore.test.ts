import { useConfirmStore } from '@/store/confirmStore'
import { act } from '@testing-library/react'

describe('confirmStore', () => {
  beforeEach(() => {
    act(() => {
      useConfirmStore.getState().close(false)
    })
  })

  it('starts closed with no options', () => {
    const state = useConfirmStore.getState()
    expect(state.open).toBe(false)
    expect(state.options).toBeNull()
  })

  it('opens the dialog with options', async () => {
    let promise: Promise<boolean>
    act(() => {
      promise = useConfirmStore.getState().confirm({
        title: 'Delete Lead?',
        message: 'This action cannot be undone.',
        variant: 'destructive',
      })
    })
    const state = useConfirmStore.getState()
    expect(state.open).toBe(true)
    expect(state.options?.title).toBe('Delete Lead?')
    expect(state.options?.variant).toBe('destructive')

    // Resolve the promise
    act(() => { useConfirmStore.getState().close(true) })
    expect(await promise!).toBe(true)
  })

  it('resolves false when cancelled', async () => {
    let promise: Promise<boolean>
    act(() => {
      promise = useConfirmStore.getState().confirm({
        title: 'Confirm',
        message: 'Are you sure?',
      })
    })
    act(() => { useConfirmStore.getState().close(false) })
    expect(await promise!).toBe(false)
    expect(useConfirmStore.getState().open).toBe(false)
  })
})
