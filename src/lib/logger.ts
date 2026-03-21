/**
 * Frontend Logger — thin wrapper over console.
 * Silent in production, logs in development. Zero dependencies.
 */

const isDev = import.meta.env.DEV

/* eslint-disable no-console */
export const logger = {
  debug: (...args: unknown[]) => { if (isDev) console.debug('[DEBUG]', ...args) },
  info: (...args: unknown[]) => { if (isDev) console.info('[INFO]', ...args) },
  warn: (...args: unknown[]) => { if (isDev) console.warn('[WARN]', ...args) },
  error: (...args: unknown[]) => { console.error('[ERROR]', ...args) },
  log: (...args: unknown[]) => { if (isDev) console.log(...args) },
}

export default logger
