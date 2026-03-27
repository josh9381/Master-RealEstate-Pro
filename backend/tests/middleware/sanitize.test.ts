import { Request, Response, NextFunction } from 'express'
import { sanitizeInput } from '../../src/middleware/sanitize'

function mockReqResNext(body = {}, query = {}, params = {}) {
  const req = { body, query, params } as unknown as Request
  const res = {} as Response
  const next = jest.fn() as NextFunction
  return { req, res, next }
}

describe('sanitizeInput middleware', () => {
  it('calls next()', () => {
    const { req, res, next } = mockReqResNext()
    sanitizeInput(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('strips HTML from body string fields', () => {
    const { req, res, next } = mockReqResNext({
      name: '<script>alert("xss")</script>John',
      email: 'john@test.com',
    })
    sanitizeInput(req, res, next)
    expect(req.body.name).not.toContain('<script>')
    expect(req.body.name).toContain('John')
    expect(req.body.email).toBe('john@test.com')
  })

  it('allows safe HTML in content fields (body, htmlContent)', () => {
    const { req, res, next } = mockReqResNext({
      body: '<h1>Welcome</h1><p>Hello <strong>world</strong></p>',
    })
    sanitizeInput(req, res, next)
    expect(req.body.body).toContain('<h1>')
    expect(req.body.body).toContain('<strong>')
  })

  it('strips script tags even from content fields', () => {
    const { req, res, next } = mockReqResNext({
      body: '<p>Hi</p><script>alert("xss")</script>',
    })
    sanitizeInput(req, res, next)
    expect(req.body.body).not.toContain('<script>')
    expect(req.body.body).toContain('<p>Hi</p>')
  })

  it('sanitizes query parameters', () => {
    const { req, res, next } = mockReqResNext({}, {
      search: '<img onerror="alert(1)" src=x>test',
    })
    sanitizeInput(req, res, next)
    expect(req.query.search).not.toContain('onerror')
  })

  it('sanitizes route params', () => {
    const { req, res, next } = mockReqResNext({}, {}, {
      id: '<script>alert(1)</script>123',
    })
    sanitizeInput(req, res, next)
    expect(req.params.id).not.toContain('<script>')
    expect(req.params.id).toContain('123')
  })

  it('handles nested objects in body', () => {
    const { req, res, next } = mockReqResNext({
      address: {
        street: '<b onmouseover="hack()">123 Main</b>',
        city: 'Miami',
      },
    })
    sanitizeInput(req, res, next)
    expect(req.body.address.street).not.toContain('onmouseover')
    expect(req.body.address.city).toBe('Miami')
  })

  it('handles arrays in body', () => {
    const { req, res, next } = mockReqResNext({
      tags: ['<script>xss</script>valid', 'clean'],
    })
    sanitizeInput(req, res, next)
    expect(req.body.tags[0]).not.toContain('<script>')
    expect(req.body.tags[0]).toContain('valid')
    expect(req.body.tags[1]).toBe('clean')
  })

  it('handles null/undefined body gracefully', () => {
    const req = { body: null, query: {}, params: {} } as unknown as Request
    const res = {} as Response
    const next = jest.fn()
    sanitizeInput(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})
