/**
 * Structured Logger
 *
 * Wraps pino with console-compatible variadic signatures so that
 * `logger.info('msg', value)` and `logger.error('msg', err)` work
 * the same as the old console.* calls.
 *
 * Production: JSON output via pino.  Development: pretty-print.
 */
import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const _pino = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  ...(isProduction
    ? {
        formatters: {
          level(label: string) {
            return { level: label };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }),
});

/** Console-compatible wrapper: accepts variadic args like console.log */
function wrap(level: 'info' | 'error' | 'warn' | 'debug' | 'fatal' | 'trace') {
  return (...args: unknown[]) => {
    if (args.length === 0) return;
    if (args.length === 1) {
      if (typeof args[0] === 'object' && args[0] !== null) {
        _pino[level](args[0] as object);
      } else {
        _pino[level](String(args[0]));
      }
    } else {
      // First arg = message string, rest = interpolation values
      const msg = String(args[0]);
      const rest = args.slice(1);
      // If second arg is an Error-like object, pass it as pino mergingObject
      if (rest.length === 1 && rest[0] instanceof Error) {
        _pino[level]({ err: rest[0] }, msg);
      } else {
        _pino[level](msg + ' ' + rest.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      }
    }
  };
}

export const logger = {
  info: wrap('info'),
  error: wrap('error'),
  warn: wrap('warn'),
  debug: wrap('debug'),
  fatal: wrap('fatal'),
  trace: wrap('trace'),
  /** Access the underlying pino instance for middleware / advanced use */
  pino: _pino,
};

export default logger;
