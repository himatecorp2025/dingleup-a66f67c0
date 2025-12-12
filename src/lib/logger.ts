/**
 * Production-safe logger utility
 * In production: only errors are logged
 * In development: all logs are visible
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  
  error: (...args: unknown[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
  
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  
  // Group logging for structured output
  group: (label: string) => {
    if (isDev) console.group(label);
  },
  
  groupEnd: () => {
    if (isDev) console.groupEnd();
  },
  
  // Table for data visualization
  table: (data: unknown) => {
    if (isDev) console.table(data);
  },
  
  // Time tracking
  time: (label: string) => {
    if (isDev) console.time(label);
  },
  
  timeEnd: (label: string) => {
    if (isDev) console.timeEnd(label);
  },
};

// Default export for convenience
export default logger;
