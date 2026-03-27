import { getErrorMessage } from '../../src/utils/errors'

describe('getErrorMessage', () => {
  it('returns message from Error instance', () => {
    expect(getErrorMessage(new Error('Something broke'))).toBe('Something broke')
  })

  it('converts non-Error to string', () => {
    expect(getErrorMessage('string error')).toBe('string error')
    expect(getErrorMessage(42)).toBe('42')
    expect(getErrorMessage(null)).toBe('null')
    expect(getErrorMessage(undefined)).toBe('undefined')
  })

  it('handles objects', () => {
    expect(getErrorMessage({ code: 'ERR' })).toBe('[object Object]')
  })
})
