import { logger } from '../logger'

describe('logger', () => {
  it('exposes debug, info, warn, error, log methods', () => {
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.log).toBe('function')
  })

  it('error logs to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    logger.error('test error message')
    expect(spy).toHaveBeenCalledWith('[ERROR]', 'test error message')
    spy.mockRestore()
  })

  it('debug does not throw', () => {
    expect(() => logger.debug('debug msg')).not.toThrow()
  })

  it('info does not throw', () => {
    expect(() => logger.info('info msg')).not.toThrow()
  })

  it('warn does not throw', () => {
    expect(() => logger.warn('warn msg')).not.toThrow()
  })

  it('log does not throw', () => {
    expect(() => logger.log('log msg')).not.toThrow()
  })
})
