import { renderHook, act } from '@testing-library/react'
import { useConfirm } from '@/hooks/useConfirm'
import { useConfirmStore } from '@/store/confirmStore'

describe('useConfirm', () => {
  beforeEach(() => {
    useConfirmStore.setState({ open: false, options: null, resolve: null })
  })

  it('returns a confirm function', () => {
    const { result } = renderHook(() => useConfirm())
    expect(typeof result.current).toBe('function')
  })

  it('opens confirm dialog and resolves true on close', async () => {
    const { result } = renderHook(() => useConfirm())

    let resolved: boolean | undefined
    act(() => {
      result.current({ title: 'Delete?', message: 'Are you sure?' }).then((v) => {
        resolved = v
      })
    })

    expect(useConfirmStore.getState().open).toBe(true)
    expect(useConfirmStore.getState().options?.title).toBe('Delete?')

    act(() => {
      useConfirmStore.getState().close(true)
    })

    await new Promise((r) => setTimeout(r, 0))
    expect(resolved).toBe(true)
  })

  it('resolves false on cancel', async () => {
    const { result } = renderHook(() => useConfirm())

    let resolved: boolean | undefined
    act(() => {
      result.current({ title: 'Cancel?', message: 'Sure?' }).then((v) => {
        resolved = v
      })
    })

    act(() => {
      useConfirmStore.getState().close(false)
    })

    await new Promise((r) => setTimeout(r, 0))
    expect(resolved).toBe(false)
  })
})
