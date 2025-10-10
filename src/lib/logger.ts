/**
 * Secure logging utility that only logs in development mode
 * This prevents sensitive data from being exposed in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log debug information (only in development)
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log informational messages (only in development)
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Log warnings (always logged)
   */
  warn: (...args: any[]) => {
    console.warn(...args);
  },

  /**
   * Log errors (always logged)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Log security-related events (always logged)
   */
  security: (message: string, details?: any) => {
    console.warn('[SECURITY]', message, details || '');
  },
};
