/**
 * Frontend Logger — thin wrapper over console.
 * Silent in production, logs in development. Zero dependencies.
 */

const isDev = import.meta.env.DEV

/* eslint-disable no-console */
export const logger = {
  debug: (...args: unknown[]) => { if (isDev) logger.debug('[DEBUG]', ...args) },
  info: (...args: unknown[]) => { if (isDev) logger.info('[INFO]', ...args) },
  warn: (...args: unknown[]) => { if (isDev) logger.warn('[WARN]', ...args) },
  error: (...args: unknown[]) => { logger.error('[ERROR]', ...args) },
  log: (...args: unknown[]) => { if (isDev) logger.log(...args) },
}

export default logger
