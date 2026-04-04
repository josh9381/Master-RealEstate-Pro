describe('devErrorMonitor', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.stubEnv('DEV', true)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('getDevErrors returns empty array when no errors stored', async () => {
    const { getDevErrors } = await import('../devErrorMonitor')
    expect(getDevErrors()).toEqual([])
  })

  it('addDevError stores an error in session storage', async () => {
    const { addDevError, getDevErrors } = await import('../devErrorMonitor')
    addDevError({ type: 'runtime', message: 'Test error' })

    const errors = getDevErrors()
    expect(errors.length).toBe(1)
    expect(errors[0]).toMatchObject({
      type: 'runtime',
      message: 'Test error',
      count: 1,
    })
    expect(errors[0].id).toBeDefined()
    expect(errors[0].timestamp).toBeDefined()
  })

  it('deduplicates errors by message and type', async () => {
    const { addDevError, getDevErrors } = await import('../devErrorMonitor')
    addDevError({ type: 'api', message: 'GET /api/leads → 500' })
    addDevError({ type: 'api', message: 'GET /api/leads → 500' })

    const errors = getDevErrors()
    expect(errors.length).toBe(1)
    expect(errors[0].count).toBe(2)
  })

  it('clearDevErrors removes all errors', async () => {
    const { addDevError, clearDevErrors, getDevErrors } = await import('../devErrorMonitor')
    addDevError({ type: 'runtime', message: 'err' })
    clearDevErrors()
    expect(getDevErrors()).toEqual([])
  })

  it('devApiErrorInterceptor tracks API errors', async () => {
    const { devApiErrorInterceptor, getDevErrors } = await import('../devErrorMonitor')
    const error = {
      config: { url: '/api/leads', method: 'get' },
      response: { status: 500, statusText: 'Internal Server Error' },
      stack: 'stack trace',
    }

    await devApiErrorInterceptor(error).catch(() => {})

    const errors = getDevErrors()
    const apiError = errors.find(e => e.type === 'api')
    expect(apiError).toBeDefined()
    expect(apiError?.status).toBe(500)
  })

  it('devApiErrorInterceptor re-throws the error', async () => {
    const { devApiErrorInterceptor } = await import('../devErrorMonitor')
    const error = { config: { url: '/test', method: 'get' }, response: { status: 404 } }

    await expect(devApiErrorInterceptor(error)).rejects.toBe(error)
  })

  it('devApiSuccessInterceptor passes through normal responses', async () => {
    const { devApiSuccessInterceptor } = await import('../devErrorMonitor')
    const response = { data: { success: true, data: { leads: [] } }, config: { url: '/api/leads', method: 'get' }, status: 200 }
    expect(devApiSuccessInterceptor(response)).toBe(response)
  })

  it('devApiSuccessInterceptor detects double-wrapped responses', async () => {
    const { devApiSuccessInterceptor, getDevErrors } = await import('../devErrorMonitor')
    const response = {
      data: { success: true, data: { success: true, data: { nested: true } } },
      config: { url: '/api/test', method: 'get' },
      status: 200,
    }
    devApiSuccessInterceptor(response)

    const errors = getDevErrors()
    const doubleWrap = errors.find(e => e.message.includes('Double-wrapped'))
    expect(doubleWrap).toBeDefined()
  })
})
