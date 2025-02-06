import debug from 'debug';

// Enable all logs in development/test environment
if (process.env.NODE_ENV !== 'production') {
  debug.enable('subtitle:*');
}

// Export individual loggers
export const vtt = debug('subtitle:vtt');
export const parser = debug('subtitle:parser');
export const generator = debug('subtitle:generator');
export const test = debug('subtitle:test'); 