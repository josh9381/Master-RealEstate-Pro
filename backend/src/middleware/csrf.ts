import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

/**
 * CSRF Protection Middleware
 *
 * This application uses JWT Bearer tokens stored in localStorage — not cookies.
 * The standard cookie-based CSRF attack vector does not apply here because:
 *   - Browsers cannot attach custom Authorization headers cross-origin (CORS blocks it)
 *   - LocalStorage is not automatically sent by the browser like cookies
 *
 * However, defense-in-depth is still valuable. This middleware adds two layers:
 *
 * 1. Content-Type enforcement: Rejects state-changing requests that arrive with
 *    `application/x-www-form-urlencoded` or `multipart/form-data` Content-Type on
 *    JSON API endpoints. HTML forms can only submit these types — not `application/json` —
 *    so this blocks classic HTML-form CSRF attempts.
 *
 * 2. Origin / Referer header validation: Verifies that cross-site state-changing
 *    requests originate from an allowed origin. Provides a server-side double-check
 *    that reinforces the CORS policy.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// Routes exempt from CSRF checks (external callers like Stripe, GitHub Actions, etc.)
const EXEMPT_PREFIXES = [
  '/api/webhooks/', // Stripe, external webhook callers
  '/health',
  '/api/docs', // Public documentation API
  '/api/unsubscribe', // Unsubscribe links from emails
]

function isExempt(path: string): boolean {
  return EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix))
}

// Routes that accept multipart/form-data for file uploads
const MULTIPART_PREFIXES = [
  '/api/settings/',   // avatar, logo uploads
  '/api/messages/',   // attachment uploads
  '/api/campaigns/',  // campaign asset uploads
]

/**
 * Returns all allowed origins for the current environment, as URL hostnames.
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = []

  if (process.env.FRONTEND_URL) {
    try {
      origins.push(new URL(process.env.FRONTEND_URL).hostname)
    } catch {
      /* ignore malformed env var */
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    // Development origins
    origins.push('localhost', '127.0.0.1')
    // GitHub Codespaces
    if (process.env.CODESPACE_NAME) {
      origins.push(`${process.env.CODESPACE_NAME}-3000.app.github.dev`)
      origins.push(`${process.env.CODESPACE_NAME}-5173.app.github.dev`)
      origins.push(`${process.env.CODESPACE_NAME}-5174.app.github.dev`)
    }
  }

  return origins
}

/**
 * Extracts the hostname from an Origin or Referer header value.
 * Returns null if the header is absent or malformed.
 */
function extractHostname(header: string | undefined): string | null {
  if (!header) return null
  try {
    return new URL(header).hostname
  } catch {
    return null
  }
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Safe methods (GET, HEAD, OPTIONS) are read-only; no CSRF risk
  if (SAFE_METHODS.has(req.method)) {
    return next()
  }

  // Exempt routes (webhooks, public actions)
  if (isExempt(req.path)) {
    return next()
  }

  // In development with no explicit FRONTEND_URL, allow all (avoid blocking local dev)
  if (process.env.NODE_ENV !== 'production' && !process.env.FRONTEND_URL) {
    return next()
  }

  const origin = req.headers['origin']
  const referer = req.headers['referer']

  // Check 1: Reject form-encoded content types on JSON API endpoints.
  // HTML forms cannot set Content-Type: application/json, so if we receive
  // form-encoded data on a JSON endpoint it was not sent by our SPA.
  const contentType = req.headers['content-type'] || ''
  if (
    (contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')) &&
    !MULTIPART_PREFIXES.some((prefix) => req.path.startsWith(prefix))
  ) {
    logger.warn(
      { method: req.method, path: req.path, contentType, ip: req.ip },
      'CSRF: Rejected form-encoded content type on JSON API endpoint'
    )
    res.status(403).json({ error: 'Forbidden: unexpected content type' })
    return
  }

  // Check 2: Origin / Referer validation for cross-origin requests.
  // If the browser sends an Origin or Referer header, verify it is from an allowed host.
  const sourceHostname = extractHostname(origin) ?? extractHostname(referer)

  if (sourceHostname !== null) {
    const allowed = getAllowedOrigins()
    const isAllowed = allowed.some(
      (h) => sourceHostname === h || sourceHostname.endsWith(`.${h}`)
    )

    if (!isAllowed) {
      logger.warn(
        { method: req.method, path: req.path, sourceHostname, allowed, ip: req.ip },
        'CSRF: Rejected request from disallowed origin'
      )
      res.status(403).json({ error: 'Forbidden: disallowed origin' })
      return
    }
  }

  // No Origin/Referer header at all — allow (mobile apps, Postman, curl, server-to-server)
  next()
}
