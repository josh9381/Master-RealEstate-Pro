import { Request, Response, NextFunction } from 'express'
import sanitizeHtml from 'sanitize-html'

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body)
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query)
  }
  next()
}

function sanitizeObject(obj: any) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeHtml(obj[key], { allowedTags: [], allowedAttributes: {} })
    } else if (Array.isArray(obj[key])) {
      obj[key].forEach((item: any, index: number) => {
        if (typeof item === 'string') {
          obj[key][index] = sanitizeHtml(item, { allowedTags: [], allowedAttributes: {} })
        } else if (typeof item === 'object' && item !== null) {
          sanitizeObject(item)
        }
      })
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key])
    }
  }
}
