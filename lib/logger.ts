const isProduction = process.env.NODE_ENV === 'production';

/**
 * Shared logger utility. Suppresses debug/info in production.
 */
export const logger = {
  debug: (...args: unknown[]) => {
    if (!isProduction) console.debug('[DEBUG]', ...args);
  },
  info: (...args: unknown[]) => {
    if (!isProduction) console.info('[INFO]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },
};
