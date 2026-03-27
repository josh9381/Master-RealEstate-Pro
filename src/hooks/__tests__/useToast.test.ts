import { renderHook, act } from '@testing-library/react'
import { useToast } from '@/hooks/useToast'
import { useToastStore } from '@/store/toastStore'

describe('useToast', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('exposes success, error, warning, info methods', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toast.success).toBeDefined()
    expect(result.current.toast.error).toBeDefined()
    expect(result.current.toast.warning).toBeDefined()
    expect(result.current.toast.info).toBeDefined()
  })

  it('success adds a success toast', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.toast.success('Done!', 'Details')
    })
    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0]).toMatchObject({ type: 'success', message: 'Done!', description: 'Details' })
  })

  it('error adds an error toast', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.toast.error('Failed')
    })
    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('error')
  })

  it('warning adds a warning toast', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.toast.warning('Careful')
    })
    const toasts = useToastStore.getState().toasts
    expect(toasts[0].type).toBe('warning')
  })

  it('info adds an info toast', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.toast.info('FYI')
    })
    const toasts = useToastStore.getState().toasts
    expect(toasts[0].type).toBe('info')
  })
})
