import { Request, Response, NextFunction } from 'express'
import sanitizeHtml from 'sanitize-html'

// Fields that legitimately contain HTML (email templates, campaign bodies)
// These get a relaxed allowlist instead of full stripping (#93)
const HTML_CONTENT_FIELDS = new Set([
  'body', 'htmlContent', 'templateContent', 'html', 'content',
]);

// Allowed tags for email HTML content — standard email-safe tags
const EMAIL_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'a', 'img', 'br', 'div', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
    'strong', 'em', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'center',
    'font', 'small', 'sub', 'sup',
  ],
  allowedAttributes: {
    'a': ['href', 'target', 'rel', 'title', 'style'],
    'img': ['src', 'alt', 'width', 'height', 'style'],
    'div': ['style', 'class', 'align'],
    'span': ['style', 'class'],
    'td': ['style', 'class', 'colspan', 'rowspan', 'width', 'height', 'align', 'valign'],
    'th': ['style', 'class', 'colspan', 'rowspan', 'width', 'height', 'align', 'valign'],
    'table': ['style', 'class', 'width', 'cellpadding', 'cellspacing', 'border', 'align'],
    'tr': ['style', 'class'],
    'p': ['style', 'class', 'align'],
    'h1': ['style', 'class', 'align'],
    'h2': ['style', 'class', 'align'],
    'h3': ['style', 'class', 'align'],
    'font': ['color', 'size', 'face'],
    'center': [],
    'hr': ['style'],
  },
  // Block dangerous protocols
  allowedSchemes: ['http', 'https', 'mailto'],
};

// Strict sanitization — strips ALL HTML (for non-content fields)
const STRICT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body, true)
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query, false)
  }
  // #94: Also sanitize req.params to prevent ID-based injection
  if (req.params && typeof req.params === 'object') {
    sanitizeObject(req.params, false)
  }
  next()
}

function sanitizeObject(obj: any, checkHtmlFields: boolean) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Use relaxed sanitization for known HTML content fields (#93)
      const options = (checkHtmlFields && HTML_CONTENT_FIELDS.has(key))
        ? EMAIL_HTML_OPTIONS
        : STRICT_OPTIONS;
      obj[key] = sanitizeHtml(obj[key], options)
    } else if (Array.isArray(obj[key])) {
      obj[key].forEach((item: any, index: number) => {
        if (typeof item === 'string') {
          obj[key][index] = sanitizeHtml(item, STRICT_OPTIONS)
        } else if (typeof item === 'object' && item !== null) {
          sanitizeObject(item, checkHtmlFields)
        }
      })
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key], checkHtmlFields)
    }
  }
}
