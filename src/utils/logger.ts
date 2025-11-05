/**
 * Logger Configuration
 *
 * Strukturiertes Logging mit pino
 */

import pino from 'pino';

/**
 * Log Level aus Environment oder default 'info'
 */
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

/**
 * Pretty Print in Development
 */
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Logger Instanz
 *
 * Logs gehen nach stderr statt stdout, damit sie nicht die CLI stören
 */
export const logger = pino({
  level: LOG_LEVEL,
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          destination: 2, // stderr statt stdout
        },
      }
    : undefined,
  base: {
    service: 'say10',
  },
});

/**
 * Logger für spezifische Module
 */
export function getLogger(module: string) {
  return logger.child({ module });
}

/**
 * Log Tool Execution
 */
export function logToolExecution(toolName: string, args: any, duration?: number) {
  logger.info(
    {
      tool: toolName,
      args,
      duration,
    },
    'Tool executed'
  );
}

/**
 * Log Tool Error
 */
export function logToolError(toolName: string, error: Error) {
  logger.error(
    {
      tool: toolName,
      error: {
        message: error.message,
        stack: error.stack,
      },
    },
    'Tool execution failed'
  );
}

export default logger;
