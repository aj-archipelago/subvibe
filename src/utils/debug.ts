// Simple internal logger that gets stripped in production builds
const createLogger = (namespace: string) => {
  return (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${namespace}]`, ...args);
    }
  };
};

// Export individual loggers
export const vtt = createLogger('subtitle:vtt');
export const parser = createLogger('subtitle:parser');
export const generator = createLogger('subtitle:generator');
export const test = createLogger('subtitle:test'); 