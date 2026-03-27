import { asyncHandler } from '../../src/utils/asyncHandler'
import { Request, Response, NextFunction } from 'express'

describe('asyncHandler', () => {
  it('calls the wrapped async function', async () => {
    const fn = jest.fn().mockResolvedValue(undefined)
    const handler = asyncHandler(fn)
    const req = {} as Request
    const res = {} as Response
    const next = jest.fn()
    await handler(req, res, next)
    expect(fn).toHaveBeenCalledWith(req, res, next)
  })

  it('catches errors and passes to next()', async () => {
    const error = new Error('DB failed')
    const fn = jest.fn().mockRejectedValue(error)
    const handler = asyncHandler(fn)
    const req = {} as Request
    const res = {} as Response
    const next = jest.fn()
    await handler(req, res, next)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('does not call next() with error when function succeeds', async () => {
    const fn = jest.fn().mockResolvedValue(undefined)
    const handler = asyncHandler(fn)
    const next = jest.fn()
    await handler({} as Request, {} as Response, next)
    expect(next).not.toHaveBeenCalledWith(expect.any(Error))
  })
})
